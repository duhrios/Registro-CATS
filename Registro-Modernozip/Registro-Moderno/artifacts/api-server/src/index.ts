import app from "./app";
import { logger } from "./lib/logger";
import { syncDrivePhotos } from "./lib/driveSync";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  const syncInterval = 10 * 60 * 1000;
  setInterval(() => {
    void syncDrivePhotos().catch((error) => {
      logger.warn({ err: error }, "Sincronização automática do Google Drive não concluída");
    });
  }, syncInterval);
  logger.info({ intervalMinutes: 10 }, "Sincronização automática do Google Drive agendada");
});
