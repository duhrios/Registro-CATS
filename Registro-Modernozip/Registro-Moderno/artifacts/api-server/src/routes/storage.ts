import { Readable } from "stream";
import { Router, type IRouter, type Request } from "express";
import { getAuth } from "@clerk/express";
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from "../lib/objectStorage";
import { ObjectPermission } from "../lib/objectAcl";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const storage = new ObjectStorageService();

function userId(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

router.post("/storage/uploads/request-url", async (req, res): Promise<void> => {
  if (!userId(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }
  const uploadURL = await storage.getObjectEntityUploadURL();
  const objectPath = storage.normalizeObjectEntityPath(uploadURL);
  res.json(
    RequestUploadUrlResponse.parse({
      uploadURL,
      objectPath,
      metadata: parsed.data,
    }),
  );
});

router.get("/storage/objects/*path", async (req, res): Promise<void> => {
  if (!userId(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const raw = req.params.path;
    const path = Array.isArray(raw) ? raw.join("/") : raw;
    const objectFile = await storage.getObjectEntityFile(`/objects/${path}`);
    const canRead = await storage.canAccessObjectEntity({
      userId: userId(req) ?? undefined,
      objectFile,
      requestedPermission: ObjectPermission.READ,
    });
    if (!canRead) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const response = await storage.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    } else res.end();
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;