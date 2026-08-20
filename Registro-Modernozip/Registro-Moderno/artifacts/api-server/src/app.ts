import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { publicSupabaseConfig } from "./lib/supabase";
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

  const deleted: string[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    if (!data.users.length) break;
    for (const user of data.users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) throw deleteError;
      deleted.push(user.id);
    }
    if (data.users.length < 1000) break;
    page += 1;
  }
  res.json({ deleted: deleted.length });
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
