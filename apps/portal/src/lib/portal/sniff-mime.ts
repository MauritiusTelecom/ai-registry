/**
 * Lightweight magic-byte sniffer for the file types we accept in review-thread
 * attachments. Avoids pulling in `file-type` (~5MB) for 7 formats.
 *
 * Returns the detected MIME, or null if the bytes don't match any known
 * signature. The caller should reject when null OR when the detected type
 * doesn't match the claimed Content-Type.
 */

export function sniffMimeType(head: Uint8Array): string | null {
  // PDF: %PDF-
  if (matches(head, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (matches(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";

  // JPEG: FF D8 FF
  if (matches(head, [0xff, 0xd8, 0xff])) return "image/jpeg";

  // GIF87a or GIF89a
  if (
    matches(head, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    matches(head, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return "image/gif";
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    matches(head, [0x52, 0x49, 0x46, 0x46]) &&
    head.length >= 12 &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50
  ) {
    return "image/webp";
  }

  // ZIP: 50 4B 03 04   (also covers .docx etc., but we restrict by Content-Type elsewhere)
  if (matches(head, [0x50, 0x4b, 0x03, 0x04])) return "application/zip";

  // Plain text — no fixed signature, accept printable-ASCII-ish heuristically
  if (isLikelyPlainText(head)) return "text/plain";

  return null;
}

function matches(buf: Uint8Array, sig: number[]): boolean {
  if (buf.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (buf[i] !== sig[i]) return false;
  }
  return true;
}

function isLikelyPlainText(head: Uint8Array): boolean {
  if (head.length === 0) return false;
  let printable = 0;
  const limit = Math.min(head.length, 512);
  for (let i = 0; i < limit; i++) {
    const b = head[i];
    if (b === 0x09 || b === 0x0a || b === 0x0d || (b >= 0x20 && b < 0x7f)) {
      printable++;
    }
  }
  return printable / limit > 0.95;
}
