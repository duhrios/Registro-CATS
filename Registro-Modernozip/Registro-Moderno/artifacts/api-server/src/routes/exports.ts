import { Router, type IRouter } from "express";
import type { AuthenticatedRequest } from "../middlewares/supabaseAuthMiddleware";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function sendCsv(res: Parameters<NonNullable<Parameters<typeof router.get>[1]>>[1], filename: string, headers: string[], rows: unknown[][]) {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(`\uFEFF${csv}`);
}

router.get("/exports/providers.csv", async (req: AuthenticatedRequest, res) => {
  if (!req.staffId) {
    res.status(401).json({ error: "Faça login para exportar os dados." });
    return;
  }
  const { data, error } = await supabase
    .from("providers")
    .select("id, name, rg, company, default_service, responsible_department, service_valid_until, notes, created_at, last_visit_at")
    .order("name", { ascending: true });
  if (error) throw error;
  sendCsv(
    res,
    `prestadores-${new Date().toISOString().slice(0, 10)}.csv`,
    ["ID", "Nome", "RG", "Empresa", "Serviço", "Setor responsável", "Validade", "Observações", "Cadastrado em", "Última visita"],
    (data ?? []).map((row) => [
      row.id, row.name, row.rg, row.company, row.default_service, row.responsible_department,
      row.service_valid_until, row.notes, row.created_at, row.last_visit_at,
    ]),
  );
});

router.get("/exports/backup.json", async (req: AuthenticatedRequest, res) => {
  if (!req.staffId) {
    res.status(401).json({ error: "Faça login para exportar os dados." });
    return;
  }
  const [{ data: providers, error: providersError }, { data: visits, error: visitsError }, { data: logs, error: logsError }] =
    await Promise.all([
      supabase.from("providers").select("*").order("name", { ascending: true }),
      supabase.from("provider_visits").select("*").order("entered_at", { ascending: false }),
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(5000),
    ]);
  if (providersError) throw providersError;
  if (visitsError) throw visitsError;
  if (logsError) throw logsError;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="backup-recepcao-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({ exportedAt: new Date().toISOString(), providers: providers ?? [], visits: visits ?? [], auditLogs: logs ?? [] });
});

export default router;