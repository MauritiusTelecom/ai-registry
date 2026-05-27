// Filesystem-backed AttachmentStorage. See spec §4.1-4.2.

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import type { Readable } from "node:stream";
import { Transform } from "node:stream";

import type {
  AttachmentStorage,
  AttachmentStorageGetResult,
  AttachmentStoragePutResult,
} from "./index";

export class FsAttachmentStorage implements AttachmentStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private resolveKey(key: string): string {
    if (key.startsWith("/") || key.includes("..")) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return join(this.root, key);
  }

  async put(
    key: string,
    stream: Readable,
    _opts: { contentType: string }
  ): Promise<AttachmentStoragePutResult> {
    const absPath = this.resolveKey(key);
    await mkdir(dirname(absPath), { recursive: true, mode: 0o700 });

    const hasher = createHash("sha256");
    let sizeBytes = 0;

    const tap = new Transform({
      transform(chunk, _enc, cb) {
        hasher.update(chunk);
        sizeBytes += chunk.length;
        cb(null, chunk);
      },
    });

    await pipeline(stream, tap, createWriteStream(absPath, { mode: 0o600 }));

    return {
      sizeBytes,
      checksumSha256: hasher.digest("hex"),
    };
  }

  async get(key: string): Promise<AttachmentStorageGetResult> {
    const absPath = this.resolveKey(key);
    const st = await stat(absPath);
    return {
      stream: createReadStream(absPath),
      sizeBytes: st.size,
      contentType: "application/octet-stream", // caller carries the real type from DB
    };
  }

  async delete(key: string): Promise<void> {
    const absPath = this.resolveKey(key);
    try {
      await unlink(absPath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }
}
