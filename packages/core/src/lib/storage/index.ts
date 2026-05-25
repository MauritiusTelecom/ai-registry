// File storage for thread attachments. See docs/specs/provider-review-thread.md §4.

import type { Readable } from "node:stream";

export interface AttachmentStoragePutResult {
  sizeBytes: number;
  checksumSha256: string;
}

export interface AttachmentStorageGetResult {
  stream: Readable;
  sizeBytes: number;
  contentType: string;
}

export interface AttachmentStorage {
  put(
    key: string,
    stream: Readable,
    opts: { contentType: string }
  ): Promise<AttachmentStoragePutResult>;
  get(key: string): Promise<AttachmentStorageGetResult>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export { FsAttachmentStorage } from "./fs-attachment-storage";
export { getAttachmentStorage } from "./factory";
