import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { db, providersTable, visitsTable } from "@workspace/db";
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
import { persistPhoto, photoUrl } from "../lib/photoStorage";

const router: IRouter = Router();

function getStaffId(req: Request, res: Response): string | null {
  const id = getAuth(req).userId;
  if (!id) {
    res.status(401).json({ error: "Faça login para acessar os registros." });
    return null;
  }
  return id;
}

function providerResponse(provider: typeof providersTable.$inferSelect, visitCount: number) {
  return {
    ...provider,
    photoData: photoUrl(provider.photoData),
    lastVisitAt: provider.lastVisitAt?.toISOString() ?? null,
    visitCount,
  };
}

async function countVisits(providerId: number): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(visitsTable)
    .where(eq(visitsTable.providerId, providerId));
  return result?.count ?? 0;
}

async function providerWithCount(id: number) {
  const [provider] = await db
    .select()
    .from(providersTable)
    .where(eq(providersTable.id, id));
  if (!provider) return null;
  return providerResponse(provider, await countVisits(id));
}

router.get("/providers", async (req, res): Promise<void> => {
  if (!getStaffId(req, res)) return;
  const parsed = ListProvidersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search, limit } = parsed.data;
  const providers = await db
    .select()
    .from(providersTable)
    .where(
      search
        ? or(
            ilike(providersTable.name, `%${search}%`),
            ilike(providersTable.company, `%${search}%`),
            ilike(providersTable.rg, `%${search}%`),
          )
        : undefined,
    )
    .orderBy(providersTable.name)
    .limit(limit);
  const rows = await Promise.all(
    providers.map(async (provider) =>
      providerResponse(provider, await countVisits(provider.id)),
    ),
  );
  res.json(ListProvidersResponse.parse(rows));
});

router.post("/providers", async (req, res): Promise<void> => {
  const staffId = getStaffId(req, res);
  if (!staffId) return;
  const parsed = CreateProviderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await db
    .select({ id: providersTable.id })
    .from(providersTable)
    .where(eq(providersTable.rg, parsed.data.rg));
  if (existing.length) {
    res.status(409).json({ error: "Este RG já está cadastrado." });
    return;
  }
  const [provider] = await db
    .insert(providersTable)
    .values({
      name: parsed.data.name.trim(),
      rg: parsed.data.rg.trim(),
      company: parsed.data.company.trim(),
      defaultService: parsed.data.defaultService.trim(),
      photoData: await persistPhoto(parsed.data.photoData, staffId),
    })
    .returning();
  res.status(201).json(
    CreateProviderResponse.parse(providerResponse(provider, 0)),
  );
});

router.get("/providers/:id", async (req, res): Promise<void> => {
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

router.patch("/providers/:id", async (req, res): Promise<void> => {
  const staffId = getStaffId(req, res);
  if (!staffId) return;
  const params = UpdateProviderParams.safeParse(req.params);
  const body = UpdateProviderBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Dados inválidos para atualização." });
    return;
  }
  const values = {
    ...(body.data.name !== undefined ? { name: body.data.name.trim() } : {}),
    ...(body.data.rg !== undefined ? { rg: body.data.rg.trim() } : {}),
    ...(body.data.company !== undefined
      ? { company: body.data.company.trim() }
      : {}),
    ...(body.data.defaultService !== undefined
      ? { defaultService: body.data.defaultService.trim() }
      : {}),
    ...(body.data.photoData !== undefined
      ? { photoData: await persistPhoto(body.data.photoData, staffId) }
      : {}),
  };
  const [provider] = await db
    .update(providersTable)
    .set(values)
    .where(eq(providersTable.id, params.data.id))
    .returning();
  if (!provider) {
    res.status(404).json({ error: "Prestador não encontrado." });
    return;
  }
  res.json(
    UpdateProviderResponse.parse(
      providerResponse(provider, await countVisits(provider.id)),
    ),
  );
});

router.get("/visits", async (req, res): Promise<void> => {
  if (!getStaffId(req, res)) return;
  const parsed = ListVisitsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rows = await db
    .select({
      id: visitsTable.id,
      providerId: providersTable.id,
      providerName: providersTable.name,
      company: providersTable.company,
      service: visitsTable.service,
      photoData: providersTable.photoData,
      enteredAt: visitsTable.enteredAt,
    })
    .from(visitsTable)
    .innerJoin(providersTable, eq(visitsTable.providerId, providersTable.id))
    .orderBy(desc(visitsTable.enteredAt))
    .limit(parsed.data.limit);
  res.json(
    ListVisitsResponse.parse(
      rows.map((row) => ({ ...row, photoData: photoUrl(row.photoData) })),
    ),
  );
});

router.post("/visits", async (req, res): Promise<void> => {
  if (!getStaffId(req, res)) return;
  const parsed = CreateVisitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [provider] = await db
    .select()
    .from(providersTable)
    .where(eq(providersTable.id, parsed.data.providerId));
  if (!provider) {
    res.status(404).json({ error: "Prestador não encontrado." });
    return;
  }
  const [visit] = await db
    .insert(visitsTable)
    .values({
      providerId: provider.id,
      service: parsed.data.service.trim(),
    })
    .returning();
  await db
    .update(providersTable)
    .set({ lastVisitAt: visit.enteredAt })
    .where(eq(providersTable.id, provider.id));
  res.status(201).json(
    CreateVisitResponse.parse({
      id: visit.id,
      providerId: provider.id,
      providerName: provider.name,
      company: provider.company,
      service: visit.service,
      photoData: photoUrl(provider.photoData),
      enteredAt: visit.enteredAt,
    }),
  );
});

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  if (!getStaffId(req, res)) return;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [providerCountRows, visitCountRows] = await Promise.all([
    db.select({ totalProviders: sql<number>`count(*)::int` }).from(providersTable),
    db
      .select({ visitsToday: sql<number>`count(*)::int` })
      .from(visitsTable)
      .where(gte(visitsTable.enteredAt, start)),
  ]);
  const totalProviders = providerCountRows[0]?.totalProviders ?? 0;
  const visitsToday = visitCountRows[0]?.visitsToday ?? 0;
  const recent = await db
    .select({
      id: visitsTable.id,
      providerId: providersTable.id,
      providerName: providersTable.name,
      company: providersTable.company,
      service: visitsTable.service,
      photoData: providersTable.photoData,
      enteredAt: visitsTable.enteredAt,
    })
    .from(visitsTable)
    .innerJoin(providersTable, eq(visitsTable.providerId, providersTable.id))
    .orderBy(desc(visitsTable.enteredAt))
    .limit(5);
  res.json(
    GetDashboardSummaryResponse.parse({
      totalProviders,
      visitsToday,
      currentlyExpected: 0,
      recentVisits: recent.map((row) => ({
        ...row,
        photoData: photoUrl(row.photoData),
      })),
    }),
  );
});

export default router;