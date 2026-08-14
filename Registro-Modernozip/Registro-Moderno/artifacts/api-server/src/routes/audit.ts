import { Router, type IRouter } from "express";
import type { AuthenticatedRequest } from "../middlewares/supabaseAuthMiddleware";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

router.get("/audit-log", async (req: AuthenticatedRequest, res) => {
  if (req.staffRole !== "admin") {
    res.status(403).json({ error: "Apenas administradores podem consultar o histórico de alterações." });
    return;
  }
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_username, action, entity_type, entity_id, entity_label, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  res.json({ logs: data ?? [] });
});

export default router;