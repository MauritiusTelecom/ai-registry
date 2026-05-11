/**
 * Field projection + payload validation shared between the API routes.
 */

import type { RefFieldDef, RefTableConfig } from "./reference-tables";

export type RefPayload = Record<string, string | number | boolean | null>;

const TYPE_BY_KIND: Record<RefFieldDef["kind"], "string" | "number" | "boolean"> = {
  text: "string",
  textarea: "string",
  boolean: "boolean",
  integer: "number"
};

/**
 * Validates an incoming POST/PATCH body against the table's field defs.
 * Returns `{ data, errors }` - when `errors` is non-empty the caller should
 * return 400.
 */
export function projectInputs(
  config: RefTableConfig,
  body: unknown,
  mode: "create" | "update"
): { data: RefPayload; errors: string[] } {
  const errors: string[] = [];
  const data: RefPayload = {};
  if (typeof body !== "object" || body === null) {
    return { data, errors: ["Body must be a JSON object"] };
  }
  const obj = body as Record<string, unknown>;

  for (const field of config.fields) {
    if (!(field.key in obj)) {
      if (mode === "create") {
        if (field.required) {
          errors.push(`${field.key} is required`);
        } else if (field.default !== undefined) {
          data[field.key] = field.default as never;
        }
      }
      continue;
    }

    const raw = obj[field.key];
    const expected = TYPE_BY_KIND[field.kind];

    if (raw === null || raw === undefined || raw === "") {
      if (field.required) errors.push(`${field.key} is required`);
      else data[field.key] = null;
      continue;
    }

    if (expected === "string") {
      if (typeof raw !== "string") errors.push(`${field.key} must be a string`);
      else {
        const trimmed = raw.trim();
        if (field.required && trimmed === "") errors.push(`${field.key} is required`);
        else data[field.key] = trimmed;
      }
    } else if (expected === "number") {
      const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
      if (!Number.isFinite(n)) errors.push(`${field.key} must be an integer`);
      else data[field.key] = n;
    } else if (expected === "boolean") {
      if (typeof raw === "boolean") data[field.key] = raw;
      else if (raw === "true") data[field.key] = true;
      else if (raw === "false") data[field.key] = false;
      else errors.push(`${field.key} must be a boolean`);
    }
  }

  return { data, errors };
}

/** The `select` clause for list / detail reads. Always includes `id`. */
export function selectClauseFor(config: RefTableConfig): Record<string, true> {
  const sel: Record<string, true> = { id: true };
  for (const f of config.fields) sel[f.key] = true;
  // Include createdAt/updatedAt when present for the detail page; absent
  // schema fields are silently ignored by Prisma's TS layer in the runtime
  // proxy (we'll project these only if the table actually has them - handled
  // by the page mapper, not by Prisma).
  sel.createdAt = true;
  // updatedAt may not exist on Tag / SovereigntyBasis - Prisma will throw if
  // we ask for a non-existent column, so we omit it from the generic select.
  return sel;
}
