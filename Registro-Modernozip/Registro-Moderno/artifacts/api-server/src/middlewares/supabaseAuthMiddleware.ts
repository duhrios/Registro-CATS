import type { NextFunction, Request, Response } from "express";
import { supabase } from "../lib/supabase";

export type StaffProfile = {
  user_id: string;
  username: string;
  full_name: string;
  role: "admin";
  created_at: string;
};

export type AuthenticatedRequest = Request & {
  staffId?: string;
  staffRole?: "admin";
  staffProfile?: StaffProfile;
};

export async function supabaseAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (
    req.path === "/api/config" ||
    req.path === "/api/healthz" ||
    req.path === "/api/auth/login" ||
    req.path === "/api/auth/bootstrap"
  ) {
    next();
    return;
  }

  if (req.method === "OPTIONS") {
    next();
    return;
  }

  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Faça login para acessar os registros." });
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Sua sessão expirou. Entre novamente." });
    return;
  }

  req.staffId = data.user.id;
  const { data: profile, error: profileError } = await supabase
    .from("staff_profiles")
    .select("user_id, username, full_name, role, created_at")
    .eq("user_id", data.user.id)
    .maybeSingle<StaffProfile>();

  if (profileError) {
    res.status(500).json({ error: "O perfil de acesso ainda não está configurado. Aplique o schema do Supabase." });
    return;
  }

  req.staffProfile = profile ?? undefined;
  req.staffRole = profile?.role;
  next();
}