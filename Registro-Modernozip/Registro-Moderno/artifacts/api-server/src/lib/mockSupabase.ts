type MockUser = {
  id: string;
  email: string;
  password: string;
  user_metadata: {
    username: string;
    full_name: string;
    role: "admin" | "user";
  };
};

type MockRow = Record<string, unknown>;

const now = () => new Date().toISOString();

const users: MockUser[] = [
  {
    id: "mock-admin-1",
    email: "admin@usuarios.portico.app",
    password: "admin123",
    user_metadata: {
      username: "admin",
      full_name: "Administrador da recepção",
      role: "admin",
    },
  },
];

const tables: Record<string, MockRow[]> = {
  staff_profiles: [
    {
      user_id: "mock-admin-1",
      username: "admin",
      full_name: "Administrador da recepção",
      role: "admin",
      created_at: now(),
    },
  ],
  providers: [
    {
      id: 1,
      name: "Carlos Eduardo Souza",
      rg: "12.345.678-9",
      company: "Manutenção Norte",
      default_service: "Manutenção elétrica",
      photo_data: null,
      created_at: now(),
      last_visit_at: now(),
    },
    {
      id: 2,
      name: "Ana Paula Martins",
      rg: "98.765.432-1",
      company: "Limpeza & Cia",
      default_service: "Serviço de limpeza",
      photo_data: null,
      created_at: now(),
      last_visit_at: null,
    },
  ],
  provider_visits: [
    {
      id: 1,
      provider_id: 1,
      service: "Manutenção elétrica",
      entered_at: now(),
    },
  ],
};

let nextIds = { providers: 3, provider_visits: 2 };
const sessions = new Map<string, MockUser>();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function matches(row: MockRow, filters: Array<(candidate: MockRow) => boolean>) {
  return filters.every((filter) => filter(row));
}

class MockQueryBuilder {
  private operation: "select" | "insert" | "update" | "upsert" = "select";
  private values: MockRow | MockRow[] | null = null;
  private filters: Array<(row: MockRow) => boolean> = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private maxRows: number | null = null;
  private selected = false;
  private head = false;

  constructor(private readonly tableName: string) {}

  select(_columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.selected = true;
    this.head = options?.head === true;
    return this;
  }

  insert(values: MockRow | MockRow[]) {
    this.operation = "insert";
    this.values = values;
    return this;
  }

  update(values: MockRow) {
    this.operation = "update";
    this.values = values;
    return this;
  }

  upsert(values: MockRow | MockRow[], _options?: { onConflict?: string }) {
    this.operation = "upsert";
    this.values = values;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  or(expression: string) {
    const terms = expression.split(",").map((term) => {
      const match = term.match(/^([^.]*)\.ilike\.%(.*)%$/);
      return match ? { column: match[1], value: match[2].toLowerCase() } : null;
    }).filter((term): term is { column: string; value: string } => Boolean(term));
    this.filters.push((row) => terms.some(({ column, value }) => String(row[column] ?? "").toLowerCase().includes(value)));
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(value: number) {
    this.maxRows = value;
    return this;
  }

  gte(column: string, value: string) {
    this.filters.push((row) => String(row[column]) >= value);
    return this;
  }

  returns<T>() {
    return this as unknown as PromiseLike<{
      data: T;
      count: number | null;
      error: null;
    }>;
  }

  async maybeSingle<T>() {
    const result = await this.execute();
    return { data: (result.data?.[0] as T | undefined) ?? null, error: result.error };
  }

  async single<T>() {
    const result = await this.execute();
    return { data: result.data?.[0] as T, error: result.error };
  }

  then<TResult1 = { data: MockRow[] | null; count: number | null; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: MockRow[] | null; count: number | null; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute() {
    const rows = tables[this.tableName] ?? [];
    if (this.operation === "insert" || this.operation === "upsert") {
      const input = Array.isArray(this.values) ? this.values : [this.values ?? {}];
      const inserted = input.map((value) => {
        const row = {
          ...value,
          ...(this.tableName === "providers" ? { id: nextIds.providers++, created_at: now(), last_visit_at: null } : {}),
          ...(this.tableName === "provider_visits" ? { id: nextIds.provider_visits++, entered_at: now() } : {}),
        };
        const existingIndex = this.tableName === "staff_profiles"
          ? rows.findIndex((candidate) => (candidate as { user_id?: unknown }).user_id === (row as { user_id?: unknown }).user_id)
          : -1;
        if (existingIndex >= 0) rows[existingIndex] = { ...rows[existingIndex], ...row };
        else rows.push(row);
        return existingIndex >= 0 ? rows[existingIndex] : row;
      });
      return { data: inserted, count: inserted.length, error: null as null };
    }

    let filtered = rows.filter((row) => matches(row, this.filters));
    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      filtered = filtered.sort((left, right) => {
        const comparison = String(left[column] ?? "").localeCompare(String(right[column] ?? ""));
        return ascending ? comparison : -comparison;
      });
    }
    const count = filtered.length;
    if (this.maxRows !== null) filtered = filtered.slice(0, this.maxRows);
    if (this.operation === "update") {
      filtered.forEach((row) => Object.assign(row, this.values ?? {}));
    }
    return { data: this.head ? null : clone(filtered), count, error: null as null };
  }
}

function issueSession(user: MockUser) {
  const accessToken = `mock-token-${user.id}`;
  sessions.set(accessToken, user);
  return {
    access_token: accessToken,
    refresh_token: `mock-refresh-${user.id}`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: clone(user),
  };
}

export function createMockSupabase() {
  return {
    from(tableName: string) {
      return new MockQueryBuilder(tableName);
    },
    auth: {
      async getUser(token: string) {
        const user = sessions.get(token) ?? users.find((candidate) => token === `mock-token-${candidate.id}`);
        return user
          ? { data: { user: clone(user) }, error: null }
          : { data: { user: null }, error: new Error("Sessão fictícia inválida") };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const user = users.find((candidate) => candidate.email === email && candidate.password === password);
        return user
          ? { data: { session: issueSession(user) }, error: null }
          : { data: { session: null }, error: new Error("Usuário ou senha inválidos.") };
      },
      admin: {
        async createUser({ email, password, user_metadata }: { email: string; password: string; email_confirm?: boolean; user_metadata: MockUser["user_metadata"] }) {
          if (users.some((user) => user.email === email)) {
            return { data: { user: null }, error: new Error("User already registered") };
          }
          const user: MockUser = {
            id: `mock-user-${users.length + 1}`,
            email,
            password,
            user_metadata,
          };
          users.push(user);
          return { data: { user: clone(user) }, error: null };
        },
        async deleteUser(userId: string) {
          const index = users.findIndex((user) => user.id === userId);
          if (index >= 0) users.splice(index, 1);
          tables.staff_profiles = tables.staff_profiles.filter((profile) => profile.user_id !== userId);
          return { data: { user: null }, error: null };
        },
      },
    },
  };
}

export const mockSupabaseInfo = {
  url: "http://mock.local",
  anonKey: "mock-anon-key",
  demoUsername: "admin",
  demoPassword: "admin123",
};