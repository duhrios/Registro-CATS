import type { NextFunction, Request, Response } from "express";
import { supabase } from "../lib/supabase";

export type AuthenticatedRequest = Request & { staffId?: string };

export async function supabaseAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (req.path === "/api/config" || req.path === "/api/healthz") {
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
  next();
}