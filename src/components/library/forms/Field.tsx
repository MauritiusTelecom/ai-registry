import type { ReactNode } from "react";

/**
 * Labelled form control wrapper. Replaces the
 *
 *   <div className="p-field">
 *     <label htmlFor={id}>{label}{required && ' *'}{immutable && ' (immutable)'}</label>
 *     {control}
 *     {hint && <div className="p-field-hint">{hint}</div>}
 *     {error && <div className="p-field-error">{error}</div>}
 *   </div>
 *
 * pattern every `*EditForm` re-rolls. The actual `<input>` / `<select>`
 * is the child - this primitive only owns the label / hint / error
 * layout.
 *
 *   <Field id="title" label="Title" required hint="Public-facing name">
 *     <Input id="title" name="title" value={title} onChange={…} />
 *   </Field>
 */
export function Field({
  id,
  label,
  required,
  immutable,
  hint,
  error,
  children
}: {
  id?: string;
  label?: ReactNode;
  required?: boolean;
  /** Shown as "(immutable)" after the label - used for code/slug fields after creation. */
  immutable?: boolean;
  hint?: ReactNode;
  /** Validation error message. When set, the field surfaces it under the control. */
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="p-field">
      {label ? (
        <label htmlFor={id}>
          {label}
          {required ? " *" : ""}
          {immutable ? " (immutable)" : ""}
        </label>
      ) : null}
      {children}
      {hint && !error ? <div className="p-field-hint">{hint}</div> : null}
      {error ? (
        <div
          className="p-field-error"
          style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
