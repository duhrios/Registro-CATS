import { Router, type IRouter, type Response } from "express";
import { supabase } from "../lib/supabase";
import type { AuthenticatedRequest } from "../middlewares/supabaseAuthMiddleware";
import {
  CreateProviderBody,
  CreateProviderResponse,
  CreateVisitBody,
  CreateVisitResponse,
  GetDashboardSummaryResponse,
  GetProviderParams,
  GetProviderResponse,
  ListProvidersQueryParams,
  ListProvidersResponse,
  ListVisitsQueryParams,
  ListVisitsResponse,
  UpdateProviderBody,
  UpdateProviderParams,
  UpdateProviderResponse,
} from "@workspace/api-zod";

type ProviderRow = {
  id: number;
  name: string;
  rg: string;
  company: string;
  default_service: string;
  photo_data: string | null;
  created_at: string;
  last_visit_at: string | null;
};

type VisitRow = {
  id: number;
  provider_id: number;
  service: string;
  entered_at: string;
  exit_at: string | null;
};

const router: IRouter = Router();

function getStaffId(req: AuthenticatedRequest, res: Response): string | null {
  if (!req.staffId) {
    res.status(401).json({ error: "Faça login para acessar os registros." });
    return null;
  }
  return req.staffId;
}

function providerResponse(provider: ProviderRow, visitCount: number) {
  return {
    id: provider.id,
    name: provider.name,
    rg: provider.rg,
    company: provider.company,
    defaultService: provider.default_service,
    photoData: provider.photo_data,
    createdAt: provider.created_at,
    lastVisitAt: provider.last_visit_at,
    visitCount,
  };
}

async function countVisits(providerId: number) {
  const { count, error } = await supabase
    .from("provider_visits")
    .select("id", { count: "exact", head: true })
    .eq("provider_id", providerId);
  if (error) throw error;
  return count ?? 0;
}

async function providerWithCount(id: number) {
  const { data, error } = await supabase
    .from("providers")
    .select("*")
    .eq("id", id)
    .maybeSingle<ProviderRow>();
  if (error) throw error;
  return data ? providerResponse(data, await countVisits(id)) : null;
}

async function providerMap(ids: number[]) {
  if (!ids.length) return new Map<number, ProviderRow>();
  const { data, error } = await supabase
    .from("providers")
    .select("*")
    .in("id", ids);
  if (error) throw error;
  return new Map((data as ProviderRow[]).map((provider) => [provider.id, provider]));
}

function visitResponse(visit: VisitRow, provider: ProviderRow) {
  return {
    id: visit.id,
    providerId: provider.id,
    providerName: provider.name,
    company: provider.company,
    service: visit.service,
    photoData: provider.photo_data,
    enteredAt: visit.entered_at,
    exitAt: visit.exit_at,
  };
}

router.get("/providers", async (req: AuthenticatedRequest, res) => {
  if (!getStaffId(req, res)) return;
  const parsed = ListProvidersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search, limit } = parsed.data;
  let query = supabase
    .from("providers")
    .select("*")
    .order("name", { ascending: true })
    .limit(limit) as any;
  if (search) {
    const safeSearch = search.replace(/[,%()]/g, " ");
    query = query.or(`name.ilike.%${safeSearch}%,company.ilike.%${safeSearch}%,rg.ilike.%${safeSearch}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = await Promise.all(
    (data as ProviderRow[]).map(async (provider) =>
      providerResponse(provider, await countVisits(provider.id)),
    ),
  );
  res.json(ListProvidersResponse.parse(rows));
});

router.post("/providers", async (req: AuthenticatedRequest, res) => {
  const staffId = getStaffId(req, res);
  if (!staffId) return;
  const parsed = CreateProviderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { data: existing, error: existingError } = await supabase
    .from("providers")
    .select("id")
    .eq("rg", parsed.data.rg.trim())
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    res.status(409).json({ error: "Este RG já está cadastrado." });
    return;
  }
  const { data: provider, error } = await supabase
    .from("providers")
    .insert({
      name: parsed.data.name.trim(),
      rg: parsed.data.rg.trim(),
      company: parsed.data.company.trim(),
      default_service: parsed.data.defaultService.trim(),
      photo_data: parsed.data.photoData ?? null,
    })
    .select("*")
    .single<ProviderRow>();
  if (error) throw error;
  res.status(201).json(CreateProviderResponse.parse(providerResponse(provider, 0)));
});

router.get("/providers/:id", async (req: AuthenticatedRequest, res) => {
  if (!getStaffId(req, res)) return;
  const parsed = GetProviderParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const provider = await providerWithCount(parsed.data.id);
  if (!provider) {
    res.status(404).json({ error: "Prestador não encontrado." });
    return;
  }
  res.json(GetProviderResponse.parse(provider));
});

router.patch("/providers/:id", async (req: AuthenticatedRequest, res) => {
  if (!getStaffId(req, res)) return;
  const params = UpdateProviderParams.safeParse(req.params);
  const body = UpdateProviderBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Dados inválidos para atualização." });
    return;
  }
  const values = {
    ...(body.data.name !== undefined ? { name: body.data.name.trim() } : {}),
    ...(body.data.rg !== undefined ? { rg: body.data.rg.trim() } : {}),
    ...(body.data.company !== undefined ? { company: body.data.company.trim() } : {}),
    ...(body.data.defaultService !== undefined
      ? { default_service: body.data.defaultService.trim() }
      : {}),
    ...(body.data.photoData !== undefined ? { photo_data: body.data.photoData } : {}),
  };
  const { data: provider, error } = await supabase
    .from("providers")
    .update(values)
    .eq("id", params.data.id)
    .select("*")
    .maybeSingle<ProviderRow>();
  if (error) throw error;
  if (!provider) {
    res.status(404).json({ error: "Prestador não encontrado." });
    return;
  }
  res.json(UpdateProviderResponse.parse(providerResponse(provider, await countVisits(provider.id))));
});

router.get("/visits", async (req: AuthenticatedRequest, res) => {
  if (!getStaffId(req, res)) return;
  const parsed = ListVisitsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { data: visits, error } = await supabase
    .from("provider_visits")
    .select("*")
    .order("entered_at", { ascending: false })
    .limit(parsed.data.limit)
    .returns<VisitRow[]>();
  if (error) throw error;
  const providers = await providerMap(visits.map((visit) => visit.provider_id));
  const rows = visits
    .map((visit) => {
      const provider = providers.get(visit.provider_id);
      return provider ? visitResponse(visit, provider) : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
  res.json(ListVisitsResponse.parse(rows));
});

router.post("/visits", async (req: AuthenticatedRequest, res) => {
  if (!getStaffId(req, res)) return;
  const parsed = CreateVisitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { data: provider, error: providerError } = await supabase
    .from("providers")
    .select("*")
    .eq("id", parsed.data.providerId)
    .maybeSingle<ProviderRow>();
  if (providerError) throw providerError;
  if (!provider) {
    res.status(404).json({ error: "Prestador não encontrado." });
    return;
  }
  const { data: visit, error } = await supabase
    .from("provider_visits")
    .insert({
      provider_id: provider.id,
      service: parsed.data.service.trim(),
      entered_at: new Date().toISOString(),
      exit_at: parsed.data.exitAt ? parsed.data.exitAt.toISOString() : null,
    })
    .select("*")
    .single<VisitRow>();
  if (error) throw error;
  await supabase
    .from("providers")
    .update({ last_visit_at: visit.entered_at })
    .eq("id", provider.id);
  res.status(201).json(CreateVisitResponse.parse(visitResponse(visit, provider)));
});

router.patch("/visits/:id", async (req: AuthenticatedRequest, res) => {
  if (!getStaffId(req, res)) return;
  const parsedId = Number(req.params.id);
  if (!Number.isInteger(parsedId) || parsedId < 1) {
    res.status(400).json({ error: "Identificador de visita inválido." });
    return;
  }
  const exitAt = req.body?.exitAt === null
    ? null
    : typeof req.body?.exitAt === "string" && !Number.isNaN(Date.parse(req.body.exitAt))
      ? new Date(req.body.exitAt).toISOString()
      : undefined;
  if (exitAt === undefined) {
    res.status(400).json({ error: "Informe uma data de saída válida ou deixe o campo vazio." });
    return;
  }

  const { data: visit, error } = await supabase
    .from("provider_visits")
    .update({ exit_at: exitAt })
    .eq("id", parsedId)
    .select("*")
    .maybeSingle<VisitRow>();
  if (error) throw error;
  if (!visit) {
    res.status(404).json({ error: "Visita não encontrada." });
    return;
  }
  const provider = await providerMap([visit.provider_id]);
  const providerRow = provider.get(visit.provider_id);
  if (!providerRow) {
    res.status(404).json({ error: "Prestador não encontrado." });
    return;
  }
  res.json(CreateVisitResponse.parse(visitResponse(visit, providerRow)));
});

router.get("/dashboard/summary", async (req: AuthenticatedRequest, res) => {
  if (!getStaffId(req, res)) return;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [{ count: totalProviders, error: providersError }, { count: visitsToday, error: visitsError }] =
    await Promise.all([
      supabase.from("providers").select("id", { count: "exact", head: true }),
      supabase
        .from("provider_visits")
        .select("id", { count: "exact", head: true })
        .gte("entered_at", start.toISOString()),
    ]);
  if (providersError) throw providersError;
  if (visitsError) throw visitsError;
  const { data: recent, error: recentError } = await supabase
    .from("provider_visits")
    .select("*")
    .order("entered_at", { ascending: false })
    .limit(5)
    .returns<VisitRow[]>();
  if (recentError) throw recentError;
  const providers = await providerMap(recent.map((visit) => visit.provider_id));
  res.json(
    GetDashboardSummaryResponse.parse({
      totalProviders: totalProviders ?? 0,
      visitsToday: visitsToday ?? 0,
      currentlyExpected: 0,
      recentVisits: recent
        .map((visit) => {
          const provider = providers.get(visit.provider_id);
          return provider ? visitResponse(visit, provider) : null;
        })
        .filter((row): row is NonNullable<typeof row> => row !== null),
    }),
  );
});

export default router;