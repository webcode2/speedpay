import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ObjectStorage } from "./types";

export class LocalObjectStorage implements ObjectStorage {
  constructor(private readonly rootDir: string) {}

  private resolve(key: string) {
    const full = path.resolve(this.rootDir, key);
    if (!full.startsWith(path.resolve(this.rootDir))) {
      throw new Error("Invalid storage key");
    }
    return full;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    void contentType;
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolve(key));
    } catch {
      // ignore missing
    }
  }
}
