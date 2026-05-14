import type { ReactNode } from "react";

/**
 * Group of related fields with an optional legend + description. Renders
 * a panelled border so the visual grouping is obvious in dense forms.
 *
 *   <Fieldset legend="Contact" description="Where reviewers should reach you">
 *     <Field …/>
 *     <Field …/>
 *   </Fieldset>
 */
export function Fieldset({
  legend,
  description,
  children,
  bordered = true
}: {
  legend?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Whether to draw a border + padding around the group. */
  bordered?: boolean;
}) {
  return (
    <fieldset
      style={{
        border: bordered ? "1px solid var(--border)" : "none",
        borderRadius: bordered ? 12 : 0,
        padding: bordered ? "16px 18px" : 0,
        margin: 0,
        display: "grid",
        gap: 14
      }}
    >
      {legend ? (
        <legend
          style={{
            padding: "0 8px",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text)"
          }}
        >
          {legend}
        </legend>
      ) : null}
      {description ? (
        <div
          style={{
            fontSize: 12.5,
            color: "var(--text-2)",
            marginTop: -6
          }}
        >
          {description}
        </div>
      ) : null}
      {children}
    </fieldset>
  );
}
