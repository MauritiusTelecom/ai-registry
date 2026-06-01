"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Button } from "../controls/Button";
import { Field } from "./Field";
import { FormActions } from "./FormActions";
import { Input } from "./Input";
import { Select } from "./Select";
import { TextArea } from "./TextArea";
import { Checkbox } from "./Checkbox";

/**
 * Schema-driven form. Renders one labelled input per field in `schema`,
 * tracks form state, handles submit, and surfaces server errors inline.
 * Designed to replace the boilerplate in admin/`RefRowForm.tsx`,
 * `EditResourceForm.tsx`, `NewResourceForm.tsx`, and the field-grid
 * portions of the bigger editor forms (`ResourceEditForm.tsx`,
 * `ProviderEditForm.tsx`, `ProviderResourceEditForm.tsx`).
 *
 * The form is uncontrolled by default — it manages its own state from
 * `initial`. Use `onChange` to observe values, or `onSubmit` to receive
 * the final payload.
 *
 * The schema field `kind` drives which input renders:
 *
 *   - `text`      → <Input type="text">
 *   - `email`     → <Input type="email">
 *   - `slug`      → <Input> with lowercase + a-z0-9- pattern
 *   - `code`      → <Input mono> with snake_case enforcement
 *   - `password`  → <Input type="password">
 *   - `number`    → <Input type="number">
 *   - `textarea`  → <TextArea>
 *   - `select`    → <Select> (uses `options`)
 *   - `checkbox`  → <Checkbox>
 *   - `hidden`    → renders nothing visible; value still flows through
 *
 * Custom renderers can be supplied via the `render` field property for
 * cases that don't fit the built-in kinds.
 *
 * Phase 5 in the library migration. Future-compatible with `Drawer`-based
 * row edit and `EntityGrid` integration.
 */

export type EntityFormFieldKind =
  | "text"
  | "email"
  | "slug"
  | "code"
  | "password"
  | "number"
  | "textarea"
  | "select"
  | "checkbox"
  | "hidden";

export type EntityFormFieldOption = {
  value: string;
  label: ReactNode;
};

export type EntityFormFieldDef<Values> = {
  /** Property name on the values object. */
  key: keyof Values & string;
  /** Visible label. Omit on `hidden` fields. */
  label?: ReactNode;
  kind: EntityFormFieldKind;
  required?: boolean;
  /** Mark the field as read-only after creation (e.g. immutable code/slug). */
  immutable?: boolean;
  /** Help text shown beneath the input. */
  hint?: ReactNode;
  /** Per-field placeholder. */
  placeholder?: string;
  /** Min/max/pattern/length forwarded to the native input. */
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  /** For `select` fields. */
  options?: EntityFormFieldOption[];
  /** Default value when `initial[key]` is undefined. */
  default?: Values[keyof Values];
  /** Override the rendered input. Called with current value + setter. */
  render?: (
    value: Values[keyof Values],
    setValue: (v: Values[keyof Values]) => void,
    ctx: { id: string; disabled: boolean; mode: EntityFormMode }
  ) => ReactNode;
};

export type EntityFormMode = "create" | "edit";

export type EntityFormProps<Values extends Record<string, unknown>> = {
  schema: EntityFormFieldDef<Values>[];
  initial?: Partial<Values>;
  mode?: EntityFormMode;
  /** Async submit handler. Throw or return `{ error }` to surface a message. */
  onSubmit: (
    values: Values
  ) => Promise<{ error?: string } | void> | { error?: string } | void;
  /** Called on cancel button click. Hides the cancel button when omitted. */
  onCancel?: () => void;
  submitLabel?: ReactNode;
  cancelLabel?: ReactNode;
  /** Server error to render above the actions. */
  externalError?: string | null;
  /** Read-only mode — disables every input, hides the submit button. */
  readOnly?: boolean;
  /** Wrap the field grid in this gap (px). Default 14. */
  fieldGap?: number;
  /** ID prefix for input IDs. Default "ef". */
  idPrefix?: string;
};

export function EntityForm<Values extends Record<string, unknown>>({
  schema,
  initial,
  mode = "create",
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel = "Cancel",
  externalError,
  readOnly,
  fieldGap = 14,
  idPrefix = "ef"
}: EntityFormProps<Values>) {
  const [values, setValues] = useState<Values>(() => {
    const out = {} as Values;
    for (const f of schema) {
      const i = initial?.[f.key];
      if (i !== undefined) {
        (out as Record<string, unknown>)[f.key] = i;
      } else if (f.default !== undefined) {
        (out as Record<string, unknown>)[f.key] = f.default;
      } else if (f.kind === "checkbox") {
        (out as Record<string, unknown>)[f.key] = false;
      } else if (f.kind === "number") {
        (out as Record<string, unknown>)[f.key] = 0;
      } else {
        (out as Record<string, unknown>)[f.key] = "";
      }
    }
    return out;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = useCallback(<K extends keyof Values>(key: K, v: Values[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setBusy(true);
      setError(null);
      try {
        const result = await onSubmit(values);
        if (result && "error" in result && result.error) {
          setError(result.error);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Submit failed.");
      } finally {
        setBusy(false);
      }
    },
    [onSubmit, values]
  );

  const visibleError = externalError ?? error;

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: fieldGap }}>
      {schema.map((f) => {
        if (f.kind === "hidden") return null;
        const id = `${idPrefix}-${f.key}`;
        const value = values[f.key];
        const disabled = readOnly || (f.immutable && mode === "edit");

        // Custom renderer overrides the built-in kind.
        if (f.render) {
          return (
            <Field
              key={f.key}
              id={id}
              label={f.label ?? f.key}
              required={f.required}
              immutable={f.immutable}
              hint={f.hint}
            >
              {f.render(
                value as Values[keyof Values],
                (v) => setField(f.key as keyof Values, v as Values[keyof Values]),
                { id, disabled: Boolean(disabled), mode }
              )}
            </Field>
          );
        }

        // Checkbox is a special case — no <Field> wrapper, the checkbox
        // includes its own label.
        if (f.kind === "checkbox") {
          return (
            <Checkbox
              key={f.key}
              id={id}
              checked={Boolean(value)}
              onChange={(e) => setField(f.key as keyof Values, e.target.checked as Values[keyof Values])}
              disabled={disabled}
            >
              {f.label}
              {f.required ? " *" : ""}
            </Checkbox>
          );
        }

        return (
          <Field
            key={f.key}
            id={id}
            label={f.label}
            required={f.required}
            immutable={f.immutable}
            hint={f.hint}
          >
            {renderInput(f, id, value, (v) => setField(f.key as keyof Values, v as Values[keyof Values]), Boolean(disabled))}
          </Field>
        );
      })}

      {visibleError ? (
        <div
          role="alert"
          style={{ color: "#ef4444", fontSize: 13, marginTop: 4 }}
        >
          {visibleError}
        </div>
      ) : null}

      {!readOnly ? (
        <FormActions>
          {onCancel ? (
            <Button intent="ghost" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </Button>
          ) : null}
          <Button type="submit" intent="primary" disabled={busy}>
            {busy
              ? "Saving…"
              : (submitLabel ?? (mode === "create" ? "Create" : "Save changes"))}
          </Button>
        </FormActions>
      ) : null}
    </form>
  );
}

function renderInput<Values>(
  f: EntityFormFieldDef<Values>,
  id: string,
  value: unknown,
  setValue: (v: unknown) => void,
  disabled: boolean
): ReactNode {
  const v = (value as string | number | null | undefined) ?? "";

  if (f.kind === "textarea") {
    return (
      <TextArea
        id={id}
        value={v as string}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder={f.placeholder}
        minLength={f.minLength}
        maxLength={f.maxLength}
        required={f.required}
      />
    );
  }

  if (f.kind === "select") {
    return (
      <Select
        id={id}
        value={v as string}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        required={f.required}
      >
        <option value="" disabled>
          Select…
        </option>
        {(f.options ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {typeof o.label === "string" ? o.label : o.value}
          </option>
        ))}
      </Select>
    );
  }

  if (f.kind === "number") {
    return (
      <Input
        id={id}
        type="number"
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) =>
          setValue(e.target.value === "" ? null : Number(e.target.value))
        }
        disabled={disabled}
        min={f.min}
        max={f.max}
        required={f.required}
      />
    );
  }

  if (f.kind === "code") {
    return (
      <Input
        id={id}
        mono
        value={v as string}
        onChange={(e) =>
          setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))
        }
        disabled={disabled}
        placeholder={f.placeholder ?? "snake_case"}
        minLength={f.minLength}
        maxLength={f.maxLength}
        required={f.required}
      />
    );
  }

  if (f.kind === "slug") {
    return (
      <Input
        id={id}
        value={v as string}
        onChange={(e) => setValue(e.target.value.toLowerCase())}
        disabled={disabled}
        placeholder={f.placeholder ?? "my-slug"}
        pattern={f.pattern ?? "[a-z0-9]+(?:-[a-z0-9]+)*"}
        minLength={f.minLength}
        maxLength={f.maxLength}
        required={f.required}
      />
    );
  }

  // Default: text / email / password.
  const inputType = f.kind === "email" ? "email" : f.kind === "password" ? "password" : "text";
  return (
    <Input
      id={id}
      type={inputType}
      value={v as string}
      onChange={(e) => setValue(e.target.value)}
      disabled={disabled}
      placeholder={f.placeholder}
      pattern={f.pattern}
      minLength={f.minLength}
      maxLength={f.maxLength}
      required={f.required}
    />
  );
}
