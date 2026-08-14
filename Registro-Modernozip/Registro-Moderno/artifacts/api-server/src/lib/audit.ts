import { supabase } from "./supabase";
import type { AuthenticatedRequest } from "../middlewares/supabaseAuthMiddleware";

type AuditInput = {
  action: string;
  entityType: string;
  entityId?: string | number | null;
  entityLabel?: string | null;
  details?: Record<string, unknown>;
};

export async function writeAuditLog(req: AuthenticatedRequest, input: AuditInput) {
  const { error } = await supabase.from("audit_logs").insert({
    actor_user_id: req.staffId ?? null,
    actor_username: req.staffProfile?.username ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId === undefined || input.entityId === null ? null : String(input.entityId),
    entity_label: input.entityLabel ?? null,
    details: input.details ?? {},
  });

  if (error) {
    req.log?.error({ error, audit: input }, "Não foi possível registrar a auditoria");
  }
}