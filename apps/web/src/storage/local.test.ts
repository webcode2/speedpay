import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LocalObjectStorage } from "./local";

describe("LocalObjectStorage", () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("puts and gets objects", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "solar-storage-"));
    const storage = new LocalObjectStorage(dir);
    const key = "kyc/user/doc.bin";
    const body = Buffer.from("hello-kyc");
    await storage.put(key, body, "application/octet-stream");
    const got = await storage.get(key);
    expect(got.toString("utf8")).toBe("hello-kyc");
    await storage.delete(key);
  });
});
