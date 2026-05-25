// Storage singleton — resolves THREAD_ATTACHMENT_ROOT (default ./storage)
// relative to the monorepo root.

import { resolve } from "node:path";

import { FsAttachmentStorage } from "./fs-attachment-storage";
import type { AttachmentStorage } from "./index";

let singleton: AttachmentStorage | null = null;

export function getAttachmentStorage(): AttachmentStorage {
  if (singleton) return singleton;

  const root = process.env.THREAD_ATTACHMENT_ROOT
    ? resolve(process.env.THREAD_ATTACHMENT_ROOT)
    : resolve(process.cwd(), "storage");

  singleton = new FsAttachmentStorage(root);
  return singleton;
}
