const apiBase = process.env.API_BASE_URL ?? "http://127.0.0.1:8080/api";
const total = Number(process.env.MOCK_LOAD_TOTAL ?? 1000);
const concurrency = Number(process.env.MOCK_LOAD_CONCURRENCY ?? 20);
const created = [];
const deleted = new Set();

if (!Number.isInteger(total) || total < 1) {
  throw new Error("MOCK_LOAD_TOTAL must be a positive integer.");
}
if (!Number.isInteger(concurrency) || concurrency < 1) {
  throw new Error("MOCK_LOAD_CONCURRENCY must be a positive integer.");
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    // Some endpoints may legitimately return no JSON body.
  }
  return { response, body };
}

async function expectStatus(path, options, expectedStatus) {
  const result = await request(path, options);
  if (result.response.status !== expectedStatus) {
    throw new Error(
      `${options.method ?? "GET"} ${path}: expected ${expectedStatus}, got ` +
        `${result.response.status} ${JSON.stringify(result.body)}`,
    );
  }
  return result.body;
}

async function runPool(items, worker) {
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (true) {
        const index = cursor++;
        if (index >= items.length) return;
        await worker(items[index], index);
      }
    },
  );
  await Promise.all(workers);
}

function jsonRequest(method, body, token) {
  return {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  };
}

function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

function uniqueRunId() {
  return Date.now().toString(36).slice(-7);
}

async function cleanup(adminToken) {
  await runPool(
    created.filter((user) => !deleted.has(user.id)),
    async (user) => {
      const result = await request(
        `/auth/users/${user.id}`,
        jsonRequest("DELETE", {}, adminToken),
      );
      if (result.response.ok || result.response.status === 404) {
        deleted.add(user.id);
      }
    },
  );
}

async function main() {
  const startedAt = Date.now();
  const adminLogin = await expectStatus(
    "/auth/login",
    jsonRequest("POST", { username: "admin", password: "admin123" }),
    200,
  );
  const adminToken = adminLogin.session.access_token;
  const adminId = adminLogin.profile.user_id;
  const runId = uniqueRunId();

  try {
    const jobs = Array.from({ length: total }, (_, index) => ({
      username: `load${runId}${index.toString(36).padStart(3, "0")}`,
      fullName: `Usuário de carga ${index + 1}`,
      password: `Inicial${index.toString(36).padStart(4, "0")}!`,
      role: index % 2 === 0 ? "admin" : "user",
    }));

    await runPool(jobs, async (job) => {
      const body = await expectStatus(
        "/auth/users",
        jsonRequest("POST", job, adminToken),
        201,
      );
      created.push({ ...job, id: body.user.id });
    });
    if (created.length !== total) {
      throw new Error(`Created ${created.length} of ${total} users.`);
    }

    const initialAdmins = created.filter((user) => user.role === "admin").length;
    const initialUsers = total - initialAdmins;

    await runPool(created, async (user, index) => {
      const update = {
        fullName: `Usuário editado ${index + 1}`,
        password: `Editada${index.toString(36).padStart(4, "0")}!`,
        role: user.role === "admin" ? "user" : "admin",
      };
      await expectStatus(
        `/auth/users/${user.id}`,
        jsonRequest("PATCH", update, adminToken),
        200,
      );
      Object.assign(user, update);
    });

    let deletedUserToken = null;
    await runPool(created, async (user) => {
      const login = await expectStatus(
        "/auth/login",
        jsonRequest("POST", {
          username: user.username,
          password: user.password,
        }),
        200,
      );
      if (
        login.profile.user_id !== user.id ||
        login.profile.full_name !== user.fullName ||
        login.profile.role !== user.role
      ) {
        throw new Error(`Profile mismatch after login for ${user.username}.`);
      }
      if (!deletedUserToken && user.role === "admin") {
        deletedUserToken = login.session.access_token;
      }
      await expectStatus(
        "/auth/users",
        authHeaders(login.session.access_token),
        user.role === "admin" ? 200 : 403,
      );
    });

    await expectStatus(
      `/auth/users/${adminId}`,
      jsonRequest(
        "PATCH",
        { fullName: "Administrador da recepção", role: "user" },
        adminToken,
      ),
      400,
    );

    const beforeCleanup = await expectStatus(
      "/auth/users",
      authHeaders(adminToken),
      200,
    );
    if (beforeCleanup.users.length !== total + 1) {
      throw new Error(
        `Expected ${total + 1} users before cleanup, got ${beforeCleanup.users.length}.`,
      );
    }

    await cleanup(adminToken);
    const afterCleanup = await expectStatus(
      "/auth/users",
      authHeaders(adminToken),
      200,
    );
    if (
      afterCleanup.users.length !== 1 ||
      afterCleanup.users[0].user_id !== adminId
    ) {
      throw new Error(
        `Cleanup left ${afterCleanup.users.length} users instead of the default admin.`,
      );
    }
    if (deletedUserToken) {
      await expectStatus("/auth/users", authHeaders(deletedUserToken), 401);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          totalCreated: created.length,
          initialProfiles: { admin: initialAdmins, user: initialUsers },
          edited: created.length,
          loginsValidated: created.length,
          permissionsValidated: created.length,
          deleted: deleted.size,
          remainingUsers: afterCleanup.users.length,
          selfDemotionStatus: 400,
          deletedSessionStatus: 401,
          concurrency,
          elapsedSeconds: Number(
            ((Date.now() - startedAt) / 1000).toFixed(2),
          ),
        },
        null,
        2,
      ),
    );
  } finally {
    await cleanup(adminToken);
  }
}

main().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});