import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { Readable } from "node:stream";
import { google } from "googleapis";
import { supabase } from "./supabase";

const FOLDER_ID_PATTERN = /\/folders\/([^/?#]+)/;
const PHOTO_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/;

type DriveSettingsRow = {
  drive_folder_url: string | null;
  google_cloud_project_url: string | null;
  google_client_id: string | null;
  google_client_secret_encrypted: string | null;
  google_drive_refresh_token_encrypted: string | null;
  drive_last_sync_at: string | null;
  drive_last_sync_status: string | null;
  drive_last_sync_message: string | null;
  drive_last_sync_count: number;
};

type ProviderPhotoRow = {
  id: number;
  name: string;
  rg: string;
  company: string;
  photo_data: string;
};

type SyncFileRow = {
  provider_id: number;
  drive_file_id: string;
  photo_checksum: string;
};

export type DriveStatus = {
  folderUrl: string | null;
  googleCloudProjectUrl: string | null;
  googleClientId: string | null;
  googleClientSecretConfigured: boolean;
  googleRefreshTokenConfigured: boolean;
  configured: boolean;
  missingConfiguration: string[];
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncMessage: string | null;
  lastSyncCount: number;
};

export class DriveConfigurationError extends Error {
  readonly code = "DRIVE_NOT_CONFIGURED";

  constructor(message: string) {
    super(message);
    this.name = "DriveConfigurationError";
  }
}

function configuredFolderUrl() {
  return process.env.GOOGLE_DRIVE_FOLDER_URL?.trim() || null;
}

function encryptionKey() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) {
    throw new DriveConfigurationError(
      "Configure SESSION_SECRET no servidor para proteger as credenciais do Google Drive.",
    );
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptDriveSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${authTag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

function decryptDriveSecret(value: string | null) {
  if (!value) return null;
  const [version, ivValue, authTagValue, encryptedValue] = value.split(":");
  if (version !== "v1" || !ivValue || !authTagValue || !encryptedValue) {
    throw new DriveConfigurationError("As credenciais salvas do Google Drive estão inválidas.");
  }
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new DriveConfigurationError(
      "Não foi possível desbloquear as credenciais do Google Drive. Confira o SESSION_SECRET.",
    );
  }
}

function folderIdFromUrl(folderUrl: string) {
  const match = folderUrl.match(FOLDER_ID_PATTERN);
  if (!match?.[1]) {
    throw new DriveConfigurationError(
      "O link da pasta do Google Drive não é válido. Use https://drive.google.com/drive/folders/...",
    );
  }
  return match[1];
}

function missingOAuthConfiguration() {
  return [
    !process.env.GOOGLE_CLIENT_ID?.trim() ? "GOOGLE_CLIENT_ID" : null,
    !process.env.GOOGLE_CLIENT_SECRET?.trim() ? "GOOGLE_CLIENT_SECRET" : null,
    !process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim() ? "GOOGLE_DRIVE_REFRESH_TOKEN" : null,
  ].filter((value): value is string => value !== null);
}

async function storedSettings() {
  const { data, error } = await supabase
    .from("school_settings")
    .select("drive_folder_url, google_cloud_project_url, google_client_id, google_client_secret_encrypted, google_drive_refresh_token_encrypted, drive_last_sync_at, drive_last_sync_status, drive_last_sync_message, drive_last_sync_count")
    .eq("id", true)
    .maybeSingle<DriveSettingsRow>();
  if (error) throw error;
  return data;
}

async function updateSyncState(
  status: "success" | "error",
  message: string,
  count: number,
) {
  const { error } = await supabase
    .from("school_settings")
    .upsert({
      id: true,
      drive_last_sync_at: new Date().toISOString(),
      drive_last_sync_status: status,
      drive_last_sync_message: message,
      drive_last_sync_count: count,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}

async function effectiveConfiguration(settings: DriveSettingsRow | null) {
  return {
    folderUrl: settings?.drive_folder_url || configuredFolderUrl(),
    projectUrl: settings?.google_cloud_project_url || process.env.GOOGLE_CLOUD_PROJECT_URL?.trim() || null,
    clientId: settings?.google_client_id || process.env.GOOGLE_CLIENT_ID?.trim() || null,
    clientSecret: decryptDriveSecret(settings?.google_client_secret_encrypted)
      || process.env.GOOGLE_CLIENT_SECRET?.trim()
      || null,
    refreshToken: decryptDriveSecret(settings?.google_drive_refresh_token_encrypted)
      || process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim()
      || null,
  };
}

function missingOAuthConfiguration(configuration: Awaited<ReturnType<typeof effectiveConfiguration>>) {
  return [
    !configuration.clientId ? "GOOGLE_CLIENT_ID" : null,
    !configuration.clientSecret ? "GOOGLE_CLIENT_SECRET" : null,
    !configuration.refreshToken ? "GOOGLE_DRIVE_REFRESH_TOKEN" : null,
  ].filter((value): value is string => value !== null);
}

function driveClient(configuration: Awaited<ReturnType<typeof effectiveConfiguration>>) {
  const missing = missingOAuthConfiguration(configuration);
  if (missing.length) {
    throw new DriveConfigurationError(
      `Configure no servidor: ${missing.join(", ")}.`,
    );
  }
  const auth = new google.auth.OAuth2(
    configuration.clientId,
    configuration.clientSecret,
    process.env.GOOGLE_DRIVE_REDIRECT_URI || "http://localhost:8080/api/settings/drive/callback",
  );
  auth.setCredentials({ refresh_token: configuration.refreshToken });
  return google.drive({ version: "v3", auth });
}

export async function getDriveStatus(): Promise<DriveStatus> {
  const settings = await storedSettings();
  const configuration = await effectiveConfiguration(settings);
  const missingConfiguration = [
    !configuration.folderUrl ? "GOOGLE_DRIVE_FOLDER_URL" : null,
    ...missingOAuthConfiguration(configuration),
  ].filter((value): value is string => value !== null);

  return {
    folderUrl: configuration.folderUrl,
    googleCloudProjectUrl: configuration.projectUrl,
    googleClientId: configuration.clientId,
    googleClientSecretConfigured: Boolean(configuration.clientSecret),
    googleRefreshTokenConfigured: Boolean(configuration.refreshToken),
    configured: missingConfiguration.length === 0,
    missingConfiguration,
    lastSyncAt: settings?.drive_last_sync_at ?? null,
    lastSyncStatus: settings?.drive_last_sync_status ?? null,
    lastSyncMessage: settings?.drive_last_sync_message ?? null,
    lastSyncCount: settings?.drive_last_sync_count ?? 0,
  };
}

function photoParts(photoData: string) {
  const match = photoData.match(PHOTO_PATTERN);
  if (!match) {
    throw new Error("A foto de um prestador está em um formato inválido.");
  }
  const extension = match[1].split("/")[1] === "jpeg" ? "jpg" : match[1].split("/")[1];
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
    extension,
  };
}

function safeFileName(provider: ProviderPhotoRow, extension: string) {
  const label = `${provider.name} - ${provider.company} - RG ${provider.rg}`;
  return `${label.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim()}.${extension}`;
}

async function saveFailure(message: string) {
  try {
    await updateSyncState("error", message, 0);
  } catch {
    // Preserve the original sync error when the database schema is not applied yet.
  }
}

export async function syncDrivePhotos() {
  let syncedCount = 0;
  try {
    const settings = await storedSettings();
    const configuration = await effectiveConfiguration(settings);
    const folderUrl = configuration.folderUrl;
    if (!folderUrl) {
      throw new DriveConfigurationError(
        "Informe a URL da pasta do Google Drive na Administração da recepção.",
      );
    }
    const folderId = folderIdFromUrl(folderUrl);
    const drive = driveClient(configuration);

    const { data: providers, error: providersError } = await supabase
      .from("providers")
      .select("id, name, rg, company, photo_data")
      .not("photo_data", "is", null)
      .returns<ProviderPhotoRow[]>();
    if (providersError) throw providersError;

    const providerIds = (providers ?? []).map((provider) => provider.id);
    const { data: storedFiles, error: storedFilesError } = providerIds.length
      ? await supabase
        .from("drive_sync_files")
        .select("provider_id, drive_file_id, photo_checksum")
        .in("provider_id", providerIds)
        .returns<SyncFileRow[]>()
      : { data: [], error: null };
    if (storedFilesError) throw storedFilesError;
    const storedByProvider = new Map(
      (storedFiles ?? []).map((file) => [file.provider_id, file]),
    );

    for (const provider of providers ?? []) {
      const { mimeType, buffer, extension } = photoParts(provider.photo_data);
      const checksum = createHash("sha256").update(buffer).digest("hex");
      const existing = storedByProvider.get(provider.id);
      if (existing?.photo_checksum === checksum) continue;

      const requestBody = {
        name: safeFileName(provider, extension),
        parents: existing ? undefined : [folderId],
        description: `Foto do prestador ${provider.name}. Sincronizada pelo Controle de Prestadores.`,
        appProperties: { providerId: String(provider.id), photoChecksum: checksum },
      };
      const media = { mimeType, body: Readable.from(buffer) };
      const result = existing
        ? await drive.files.update({
          fileId: existing.drive_file_id,
          requestBody,
          media,
          fields: "id,webViewLink",
        })
        : await drive.files.create({
          requestBody,
          media,
          fields: "id,webViewLink",
        });
      if (!result.data.id) throw new Error(`O Google Drive não retornou o ID da foto de ${provider.name}.`);

      const { error: mappingError } = await supabase
        .from("drive_sync_files")
        .upsert({
          provider_id: provider.id,
          drive_file_id: result.data.id,
          photo_checksum: checksum,
          updated_at: new Date().toISOString(),
        });
      if (mappingError) throw mappingError;
      syncedCount += 1;
    }

    const message = syncedCount
      ? `${syncedCount} foto(s) enviada(s) ou atualizada(s) no Google Drive.`
      : "As fotos já estavam sincronizadas.";
    await updateSyncState("success", message, syncedCount);
    return { syncedCount, message };
  } catch (error) {
    const message = error instanceof DriveConfigurationError || error instanceof Error
      ? error.message
      : "Não foi possível sincronizar as fotos com o Google Drive.";
    await saveFailure(message);
    throw error;
  }
}