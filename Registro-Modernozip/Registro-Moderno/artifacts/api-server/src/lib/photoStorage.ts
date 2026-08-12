export async function persistPhoto(
  photoData: string | null | undefined,
  _owner: string,
): Promise<string | null> {
  if (!photoData) return null;
  const match = photoData.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) throw new Error("Invalid photo format");
  return photoData;
}

export function photoUrl(photoData: string | null): string | null {
  return photoData;
}