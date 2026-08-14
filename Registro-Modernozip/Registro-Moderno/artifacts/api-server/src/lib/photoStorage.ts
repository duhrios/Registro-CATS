const MAX_PHOTO_BYTES = 600 * 1024;

export class PhotoValidationError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.name = "PhotoValidationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function base64ByteLength(value: string) {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((value.length * 3) / 4) - padding);
}

export async function persistPhoto(
  photoData: string | null | undefined,
  _owner: string,
): Promise<string | null> {
  if (!photoData) return null;
  const match = photoData.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) {
    throw new PhotoValidationError(
      "A foto precisa estar em JPG, PNG ou WebP.",
      "INVALID_PHOTO_FORMAT",
    );
  }
  if (base64ByteLength(match[2]) > MAX_PHOTO_BYTES) {
    throw new PhotoValidationError(
      "A foto ficou muito grande. Remova a imagem e escolha outra; ela será otimizada automaticamente.",
      "PHOTO_TOO_LARGE",
      413,
    );
  }
  return photoData;
}

export function photoUrl(photoData: string | null): string | null {
  return photoData;
}