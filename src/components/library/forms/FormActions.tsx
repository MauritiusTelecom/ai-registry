import type { ReactNode } from "react";

/**
 * Submit / Cancel button row pinned to the end of a form. Right-aligned by
 * default; pass `align="space-between"` to push the cancel to the left.
 *
 *   <FormActions>
 *     <Button intent="ghost" onClick={onCancel}>Cancel</Button>
 *     <Button intent="primary" type="submit">Save changes</Button>
 *   </FormActions>
 */
export function FormActions({
  children,
  align = "right",
  marginTop = 6
}: {
  children: ReactNode;
  align?: "right" | "left" | "space-between";
  marginTop?: number;
}) {
  const justify =
    align === "right"
      ? "flex-end"
      : align === "left"
        ? "flex-start"
        : "space-between";
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        justifyContent: justify,
        alignItems: "center",
        marginTop,
        paddingTop: 12,
        borderTop: "1px solid var(--border)"
      }}
    >
      {children}
    </div>
  );
}
