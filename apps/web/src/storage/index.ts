import path from "node:path";
import { LocalObjectStorage } from "./local";
import { R2ObjectStorage } from "./r2";
import type { ObjectStorage } from "./types";

let cached: ObjectStorage | undefined;

export function getStorage(): ObjectStorage {
  if (cached) return cached;

  const driver = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();
  if (driver === "r2") {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;
    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error("R2 storage is missing required environment variables");
    }
    cached = new R2ObjectStorage({
      endpoint,
      accessKeyId,
      secretAccessKey,
      bucket,
    });
    return cached;
  }

  const root = process.env.LOCAL_UPLOAD_DIR ?? "uploads";
  cached = new LocalObjectStorage(path.resolve(process.cwd(), root));
  return cached;
}

/** Test helper */
export function resetStorageCache() {
  cached = undefined;
}
