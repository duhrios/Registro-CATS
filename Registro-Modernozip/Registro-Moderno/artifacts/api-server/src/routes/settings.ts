import { Router, type IRouter, type Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/supabaseAuthMiddleware";
import { supabase } from "../lib/supabase";
import { getDriveStatus, syncDrivePhotos } from "../lib/driveSync";

const router: IRouter = Router();

function requireAdmin(req: AuthenticatedRequest, res: Response) {
  if (req.staffRole !== "admin") {
    res.status(403).json({ error: "Apenas o administrador pode alterar as configurações." });
    return false;
  }
  return true;
}

function isGoogleDriveFolderUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      (hostname === "drive.google.com" || hostname === "www.drive.google.com") &&
      /^\/drive(?:\/u\/\d+)?\/folders\/[^/]+/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

router.get("/settings/drive", async (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return;
  const { data, error } = await supabase
    .from("school_settings")
    .select("drive_folder_url")
    .eq("id", true)
    .maybeSingle<{ drive_folder_url: string | null }>();
  if (error) throw error;
  res.json({ driveFolderUrl: data?.drive_folder_url ?? process.env.GOOGLE_DRIVE_FOLDER_URL?.trim() ?? null });
});

router.patch("/settings/drive", async (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return;
  const value = req.body?.driveFolderUrl;
  if (
    value !== null &&
    value !== "" &&
    (typeof value !== "string" || value.length > 2048 || !isGoogleDriveFolderUrl(value.trim()))
  ) {
    res.status(400).json({ error: "Cole um link https://drive.google.com/drive/folders/... válido para uma pasta do Google Drive." });
    return;
  }
  const driveFolderUrl = value === "" || value === null ? null : value.trim();
  const { data, error } = await supabase
    .from("school_settings")
    .upsert({ id: true, drive_folder_url: driveFolderUrl, updated_at: new Date().toISOString() })
    .select("drive_folder_url")
    .single<{ drive_folder_url: string | null }>();
  if (error) throw error;
  res.json({ driveFolderUrl: data.drive_folder_url ?? null });
});

router.get("/settings/drive/status", async (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(await getDriveStatus());
});

router.post("/settings/drive/sync", async (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await syncDrivePhotos();
    res.json({ ...result, status: "success" });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Não foi possível sincronizar as fotos com o Google Drive.";
    res.status(503).json({ status: "error", error: message });
  }
});

export default router;