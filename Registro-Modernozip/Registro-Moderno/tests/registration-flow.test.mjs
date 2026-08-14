import test from "node:test";
import assert from "node:assert/strict";

class RegistrationStore {
  constructor(serialized = null) {
    const state = serialized ? JSON.parse(serialized) : { users: [], providers: [], visits: [] };
    this.users = state.users;
    this.providers = state.providers;
    this.visits = state.visits;
  }

  createUser(user) {
    this.users.push(user);
    return user;
  }

  createProvider(provider) {
    this.providers.push(provider);
    return provider;
  }

  dashboard() {
    return {
      totalProviders: this.providers.length,
      recentProviders: this.providers.slice(-5).reverse(),
    };
  }

  searchProviders(term) {
    const normalized = term.toLocaleLowerCase("pt-BR");
    return this.providers.filter((provider) =>
      `${provider.name} ${provider.company} ${provider.rg} ${provider.service}`
        .toLocaleLowerCase("pt-BR")
        .includes(normalized),
    );
  }

  serialize() {
    return JSON.stringify({ users: this.users, providers: this.providers, visits: this.visits });
  }
}

test("usuário criado aparece imediatamente na lista de usuários", () => {
  const store = new RegistrationStore();
  const user = store.createUser({ id: "user-1", name: "Maria Silva", username: "maria" });
  assert.deepEqual(store.users, [user]);
  assert.equal(store.users.some((candidate) => candidate.username === "maria"), true);
});

test("prestador criado aparece no dashboard e na busca", () => {
  const store = new RegistrationStore();
  const provider = store.createProvider({
    id: 1,
    name: "Carlos Eduardo",
    company: "Clima Sul",
    rg: "12.345.678",
    service: "Manutenção",
  });

  assert.equal(store.dashboard().totalProviders, 1);
  assert.equal(store.dashboard().recentProviders[0].id, provider.id);
  assert.equal(store.searchProviders("clima sul")[0].id, provider.id);
  assert.equal(store.searchProviders("12.345.678")[0].id, provider.id);
});

test("cadastros continuam disponíveis após atualizar a página", () => {
  const beforeRefresh = new RegistrationStore();
  beforeRefresh.createUser({ id: "user-1", name: "Maria Silva", username: "maria" });
  beforeRefresh.createProvider({ id: 1, name: "Carlos Eduardo", company: "Clima Sul", rg: "12.345.678", service: "Manutenção" });

  const afterRefresh = new RegistrationStore(beforeRefresh.serialize());
  assert.equal(afterRefresh.users[0].username, "maria");
  assert.equal(afterRefresh.providers[0].name, "Carlos Eduardo");
  assert.equal(afterRefresh.searchProviders("carlos").length, 1);
});