"use client";

import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  EntityForm,
  type EntityFormFieldDef,
  type EntityFormFieldKind
} from "@/components/library";
import type { RefTableConfig, RefFieldKind } from "@airegistry/sdk";

/**
 * Form used by both /new and /[id]/edit routes for any reference table.
 *
 * Now a thin adapter: translates the table's `RefTableConfig.fields[]` into
 * `<EntityForm>` field definitions, then delegates state, validation,
 * busy-tracking, and the cancel/submit button row to `EntityForm`.
 *
 * Server contract is unchanged: POST `/api/admin/ref/[id]` for create,
 * PATCH `/api/admin/ref/[id]/[rowId]` for edit, with the values object as
 * the JSON body. Errors are surfaced through EntityForm's `externalError`
 * affordance (we set it from the catch branch).
 *
 * Visual change vs. the previous file: the form now uses the library's
 * `.p-field` + `.p-input` aesthetic (standard portal-form labels) instead
 * of the `.auth-input` mono-uppercase labels. That matches every other
 * admin form and is the right aesthetic for an operator CRUD surface.
 */

type FormValues = Record<string, string | number | boolean | null | undefined>;

const KIND_MAP: Record<RefFieldKind, EntityFormFieldKind> = {
  text: "text",
  textarea: "textarea",
  boolean: "checkbox",
  integer: "number"
};

export function RefRowForm({
  config,
  mode,
  initial
}: {
  config: RefTableConfig;
  mode: "create" | "update";
  initial?: FormValues & { id?: string };
}) {
  const router = useRouter();

  // Translate config.fields into EntityForm field defs.
  const schema: EntityFormFieldDef<FormValues>[] = useMemo(
    () =>
      config.fields.map((f) => ({
        key: f.key,
        label: f.label,
        kind: KIND_MAP[f.kind],
        required: f.required,
        hint: f.help,
        // The first column is conventionally `code` — once a row exists, the
        // code is its primary key and shouldn't change.
        immutable: f.key === "code"
      })),
    [config.fields]
  );

  // Initial values: reuse the same defaulting rules the previous form had.
  const initialValues: Partial<FormValues> = useMemo(() => {
    const out: FormValues = {};
    for (const f of config.fields) {
      const v = initial?.[f.key];
      if (v !== undefined) out[f.key] = v;
      else if (f.default !== undefined) out[f.key] = f.default;
      else if (f.kind === "boolean") out[f.key] = false;
      else if (f.kind === "integer") out[f.key] = 0;
      else out[f.key] = "";
    }
    return out;
}, [config.fields, initial]);

  return (
    <EntityForm<FormValues>
      schema={schema}
      initial={initialValues}
      mode={mode === "create" ? "create" : "edit"}
      onCancel={() => router.back()}
      submitLabel={mode === "create" ? "Create" : "Save changes"}
      onSubmit={async (values) => {
        const url =
          mode === "create"
            ? `/api/admin/ref/${config.id}`
            : `/api/admin/ref/${config.id}/${initial!.id}`;
        const method = mode === "create" ? "POST" : "PATCH";
        const res = await registryFetch(withBase(url), {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values)
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            detail?: string;
            error?: string;
            title?: string;
          };
          return {
            error:
              body.detail ?? body.error ?? body.title ?? `HTTP ${res.status}`
          };
        }
        router.push(`/admin/ref/${config.id}`);
        router.refresh();
      }}
    />
  );
}