import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../lib/supabase";
import type { AuthenticatedRequest } from "../middlewares/supabaseAuthMiddleware";

const router: IRouter = Router();
const INTERNAL_EMAIL_DOMAIN = "usuarios.portico.app";

type StaffProfile = {
  user_id: string;
  username: string;
  full_name: string;
  role: "admin" | "user";
  created_at: string;
};

function normalizeUsername(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validUsername(username: string) {
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(username);
}

function internalEmail(username: string) {
  return `${username}@${INTERNAL_EMAIL_DOMAIN}`;
}

function passwordIsValid(password: unknown) {
  return typeof password === "string" && password.length >= 6;
}

function roleIsValid(role: unknown): role is StaffProfile["role"] {
  return role === "admin" || role === "user";
}

function credentialsFromBody(body: Request["body"]) {
  const username = normalizeUsername(body?.username);
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  return { username, fullName, password };
}

async function findProfile(username: string) {
  const { data, error } = await supabase
    .from("staff_profiles")
    .select("user_id, username, full_name, role, created_at")
    .eq("username", username)
    .maybeSingle<StaffProfile>();

  if (error) throw error;
  return data;
}

async function createStaffProfile(
  userId: string,
  username: string,
  fullName: string,
  role: StaffProfile["role"],
) {
  const { data, error } = await supabase
    .from("staff_profiles")
    .upsert(
      {
        user_id: userId,
        username,
        full_name: fullName,
         role,
      },
      { onConflict: "user_id" },
    )
    .select("user_id, username, full_name, role, created_at")
    .single<StaffProfile>();

  if (error) throw error;
  return data;
}

async function createAuthUser(
  username: string,
  fullName: string,
  password: string,
  role: StaffProfile["role"],
) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: internalEmail(username),
    password,
    email_confirm: true,
    user_metadata: {
      username,
      full_name: fullName,
      role,
    },
  });

  if (error || !data.user) {
    throw error ?? new Error("Não foi possível criar o usuário.");
  }

  try {
    const profile = await createStaffProfile(data.user.id, username, fullName, role);
    return { user: data.user, profile };
  } catch (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    throw profileError;
  }
}

function validateCredentials(
  username: string,
  fullName: string,
  password: string,
  requireName = true,
) {
  if (!validUsername(username)) {
    return "O usuário deve ter de 3 a 32 caracteres, usando apenas letras, números, ponto, hífen ou sublinhado.";
  }
  if (requireName && fullName.length < 2) {
    return "Informe o nome completo do integrante.";
  }
  if (!passwordIsValid(password)) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  return null;
}

router.get("/auth/bootstrap/status", async (req: Request, res: Response) => {
  try {
    const { count, error } = await supabase
      .from("staff_profiles")
      .select("user_id", { count: "exact", head: true });
    if (error) throw error;

    res.json({ available: (count ?? 0) === 0 });
  } catch (error) {
    req.log?.error(error);
    res.status(500).json({ available: false });
  }
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const { username, password } = credentialsFromBody(req.body);
  if (!validUsername(username) || !passwordIsValid(password)) {
    res.status(400).json({ error: "Informe um usuário válido e uma senha de pelo menos 6 caracteres." });
    return;
  }

  try {
    const profile = await findProfile(username);
    if (!profile) {
      res.status(401).json({ error: "Usuário ou senha inválidos." });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: internalEmail(username),
      password,
    });
    if (error || !data.session) {
      res.status(401).json({ error: "Usuário ou senha inválidos." });
      return;
    }

    res.json({ session: data.session, profile });
  } catch (error) {
    req.log?.error(error);
    res.status(500).json({ error: "Não foi possível realizar o login. Verifique se o schema foi aplicado no Supabase." });
  }
});

router.post("/auth/bootstrap", async (req: Request, res: Response) => {
  const { username, fullName, password } = credentialsFromBody(req.body);
  const validationError = validateCredentials(username, fullName, password);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const { count, error: countError } = await supabase
      .from("staff_profiles")
      .select("user_id", { count: "exact", head: true });
    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      res.status(403).json({ error: "O administrador inicial já foi criado. Peça acesso a um administrador." });
      return;
    }

    const existing = await findProfile(username);
    if (existing) {
      res.status(409).json({ error: "Este usuário já está em uso." });
      return;
    }

    const { profile } = await createAuthUser(username, fullName, password, "admin");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: internalEmail(username),
      password,
    });
    if (error || !data.session) throw error ?? new Error("Não foi possível iniciar a sessão.");
    res.status(201).json({ session: data.session, profile });
  } catch (error) {
    req.log?.error(error);
    res.status(500).json({ error: "Não foi possível criar o administrador. Aplique o schema do Supabase e tente novamente." });
  }
});

router.get("/auth/me", (req: AuthenticatedRequest, res: Response) => {
  if (!req.staffProfile) {
    res.status(403).json({ error: "Seu usuário ainda não possui um perfil de acesso." });
    return;
  }
  res.json({ profile: req.staffProfile });
});

router.post("/auth/users", async (req: AuthenticatedRequest, res: Response) => {
  if (req.staffRole !== "admin") {
    res.status(403).json({ error: "Apenas administradores podem criar integrantes." });
    return;
  }

  const { username, fullName, password } = credentialsFromBody(req.body);
  const role = req.body?.role === undefined ? "user" : req.body.role;
  const validationError = validateCredentials(username, fullName, password);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }
  if (!roleIsValid(role)) {
    res.status(400).json({ error: "Escolha um perfil válido: administrador ou comum." });
    return;
  }

  try {
    const existing = await findProfile(username);
    if (existing) {
      res.status(409).json({ error: "Este usuário já está em uso." });
      return;
    }

    const { user, profile } = await createAuthUser(username, fullName, password, role);
    res.status(201).json({
      user: { id: user.id },
      profile,
      message: role === "admin" ? "Administrador criado com sucesso." : "Usuário comum criado para a recepção.",
    });
  } catch (error) {
    req.log?.error(error);
    const message = error instanceof Error && /already|duplicate|unique/i.test(error.message)
      ? "Este usuário já está em uso."
      : "Não foi possível criar o integrante.";
    res.status(500).json({ error: message });
  }
});

router.patch("/auth/users/:userId", async (req: AuthenticatedRequest, res: Response) => {
  if (req.staffRole !== "admin") {
    res.status(403).json({ error: "Apenas administradores podem editar usuários." });
    return;
  }

  const userId = typeof req.params.userId === "string" ? req.params.userId : "";
  if (!userId) {
    res.status(400).json({ error: "Usuário inválido." });
    return;
  }

  const fullName = typeof req.body?.fullName === "string" ? req.body.fullName.trim() : "";
  const password = req.body?.password;
  const role = req.body?.role;
  if (fullName.length < 2) {
    res.status(400).json({ error: "Informe um nome com pelo menos 2 caracteres." });
    return;
  }
  if (password !== undefined && password !== "" && !passwordIsValid(password)) {
    res.status(400).json({ error: "A nova senha precisa ter pelo menos 6 caracteres." });
    return;
  }
  if (!roleIsValid(role)) {
    res.status(400).json({ error: "Escolha um perfil válido: administrador ou comum." });
    return;
  }
  if (userId === req.staffId && role !== "admin") {
    res.status(400).json({ error: "Você não pode remover o perfil administrador da própria conta." });
    return;
  }

  try {
    const { data: target, error: profileError } = await supabase
      .from("staff_profiles")
      .select("user_id, username, full_name, role, created_at")
      .eq("user_id", userId)
      .maybeSingle<StaffProfile>();
    if (profileError) throw profileError;
    if (!target) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }

    if (target.role === "admin" && role === "user") {
      const { count, error: countError } = await supabase
        .from("staff_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");
      if (countError) throw countError;
      if ((count ?? 0) <= 1) {
        res.status(400).json({ error: "Mantenha pelo menos um administrador ativo." });
        return;
      }
    }

    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      ...(password ? { password } : {}),
      user_metadata: {
        username: target.username,
        full_name: fullName,
        role,
      },
    });
    if (authError) throw authError;

    const { data: updatedProfile, error: updateError } = await supabase
      .from("staff_profiles")
      .update({ full_name: fullName, role })
      .eq("user_id", userId)
      .select("user_id, username, full_name, role, created_at")
      .single<StaffProfile>();
    if (updateError) throw updateError;
    res.json({ profile: updatedProfile, message: "Usuário atualizado com sucesso." });
  } catch (error) {
    req.log?.error(error);
    res.status(500).json({ error: "Não foi possível atualizar o usuário." });
  }
});

router.get("/auth/users", async (req: AuthenticatedRequest, res: Response) => {
  if (req.staffRole !== "admin") {
    res.status(403).json({ error: "Apenas administradores podem listar os integrantes." });
    return;
  }

  try {
    const { data, error } = await supabase
      .from("staff_profiles")
      .select("user_id, username, full_name, role, created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;
    res.json({ users: data ?? [] });
  } catch (error) {
    req.log?.error(error);
    res.status(500).json({ error: "Não foi possível carregar a lista de usuários." });
  }
});

router.patch("/auth/users/:userId/password", async (req: AuthenticatedRequest, res: Response) => {
  if (req.staffRole !== "admin") {
    res.status(403).json({ error: "Apenas administradores podem alterar senhas." });
    return;
  }

  const userId = typeof req.params.userId === "string" ? req.params.userId : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!userId || !passwordIsValid(password)) {
    res.status(400).json({ error: "A nova senha precisa ter pelo menos 6 caracteres." });
    return;
  }

  try {
    const { data: target, error: profileError } = await supabase
      .from("staff_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle<{ user_id: string }>();
    if (profileError) throw profileError;
    if (!target) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }

    const { error } = await supabase.auth.admin.updateUserById(userId, { password });
    if (error) throw error;
    res.json({ message: "Senha atualizada com sucesso." });
  } catch (error) {
    req.log?.error(error);
    res.status(500).json({ error: "Não foi possível atualizar a senha." });
  }
});

router.delete("/auth/users/:userId", async (req: AuthenticatedRequest, res: Response) => {
  if (req.staffRole !== "admin") {
    res.status(403).json({ error: "Apenas administradores podem excluir usuários." });
    return;
  }

  const userId = typeof req.params.userId === "string" ? req.params.userId : "";
  if (!userId) {
    res.status(400).json({ error: "Usuário inválido." });
    return;
  }
  if (userId === req.staffId) {
    res.status(400).json({ error: "O administrador não pode excluir a própria conta." });
    return;
  }

  try {
    const { data: target, error: profileError } = await supabase
      .from("staff_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle<{ user_id: string }>();
    if (profileError) throw profileError;
    if (!target) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }

    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
    res.json({ message: "Usuário excluído com sucesso." });
  } catch (error) {
    req.log?.error(error);
    res.status(500).json({ error: "Não foi possível excluir o usuário." });
  }
});

export default router;