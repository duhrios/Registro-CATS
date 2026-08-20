import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { adminSupabaseConfig, publicSupabaseConfig } from "./lib/supabase";
import { supabaseAuthMiddleware } from "./middlewares/supabaseAuthMiddleware";
import { PhotoValidationError } from "./lib/photoStorage";
import { supabase } from "./lib/supabase";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));
app.get("/api/config", (_req, res) => {
  res.json(publicSupabaseConfig());
});
app.post("/api/__reset-users-confirmed", async (req, res) => {
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.ip)) {
    res.status(404).end();
    return;
  }
  const { url, serviceRoleKey } = adminSupabaseConfig();
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
  const list = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, { headers });
  if (!list.ok) throw new Error(`Supabase user listing failed with HTTP ${list.status}`);
  const payload = await list.json() as { users?: Array<{ id: string }> };
  let deleted = 0;
  for (const user of payload.users ?? []) {
    const response = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, { method: "DELETE", headers });
    if (!response.ok) throw new Error(`Supabase user deletion failed with HTTP ${response.status}`);
    deleted += 1;
  }
  res.json({ deleted });
});
app.use("/api/healthz", (_req, _res, next) => next());
app.use(supabaseAuthMiddleware);

app.use("/api", router);

app.use(
  (
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const knownError = error as {
      type?: string;
      status?: number;
      statusCode?: number;
      code?: string;
      message?: string;
    };

    if (knownError.type === "entity.too.large") {
      res.status(413).json({
        error: "A solicitação ficou muito grande. Reduza o tamanho da foto e tente novamente.",
        code: "PAYLOAD_TOO_LARGE",
      });
      return;
    }

    if (error instanceof PhotoValidationError) {
      res.status(error.statusCode).json({ error: error.message, code: error.code });
      return;
    }

    const databaseCode = knownError.code;
    if (databaseCode === "23505") {
      res.status(409).json({
        error: "Já existe um cadastro com esses dados. Confira o RG informado.",
        code: "DUPLICATE_RECORD",
      });
      return;
    }

    logger.error(
      { err: error, method: req.method, path: req.path },
      "Unhandled API error",
    );
    res.status(knownError.status ?? knownError.statusCode ?? 500).json({
      error: "Não foi possível concluir a operação agora. Tente novamente.",
      code: "INTERNAL_ERROR",
    });
  },
);

export default app;
