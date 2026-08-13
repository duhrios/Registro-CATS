import { Router, type IRouter, type Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/supabaseAuthMiddleware";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

function requireAdmin(req: AuthenticatedRequest, res: Response) {
  if (req.staffRole !== "admin") {
    res.status(403).json({ error: "Apenas o administrador pode alterar as configurações." });
    return false;
  }
  return true;
}

router.get("/settings/drive", async (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return;
  const { data, error } = await supabase
    .from("school_settings")
    .select("drive_folder_url")
    .eq("id", true)
    .maybeSingle<{ drive_folder_url: string | null }>();
  if (error) throw error;
  res.json({ driveFolderUrl: data?.drive_folder_url ?? null });
});

router.patch("/settings/drive", async (req: AuthenticatedRequest, res) => {
  if (!requireAdmin(req, res)) return;
  const value = req.body?.driveFolderUrl;
  if (value !== null && value !== "" && (typeof value !== "string" || value.length > 2048 || !/^https?:\/\//i.test(value))) {
    res.status(400).json({ error: "Cole um link online válido para a pasta de fotos." });
    return;
  }
  const driveFolderUrl = value === "" ? null : value;
  const { data, error } = await supabase
    .from("school_settings")
    .upsert({ id: true, drive_folder_url: driveFolderUrl, updated_at: new Date().toISOString() })
    .select("drive_folder_url")
    .single<{ drive_folder_url: string | null }>();
  if (error) throw error;
  res.json({ driveFolderUrl: data.drive_folder_url ?? null });
});

export default router;