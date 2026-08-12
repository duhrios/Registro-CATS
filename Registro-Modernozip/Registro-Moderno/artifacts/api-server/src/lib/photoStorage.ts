import { ObjectStorageService } from "./objectStorage";

const storage = new ObjectStorageService();

export async function persistPhoto(
  photoData: string | null | undefined,
  owner: string,
): Promise<string | null> {
  if (!photoData) return null;
  if (photoData.startsWith("/objects/")) return photoData;
  const match = photoData.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) throw new Error("Invalid photo format");

  const [, contentType, encoded] = match;
  const uploadURL = await storage.getObjectEntityUploadURL();
  const response = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: Buffer.from(encoded, "base64"),
  });
  if (!response.ok) throw new Error("Photo upload failed");

  const objectPath = storage.normalizeObjectEntityPath(uploadURL);
  await storage.trySetObjectEntityAclPolicy(objectPath, {
    owner,
    visibility: "private",
  });
  return objectPath;
}

export function photoUrl(photoData: string | null): string | null {
  return photoData?.startsWith("/objects/")
    ? `/api/storage${photoData}`
    : photoData;
}