import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

/**
 * Native checkbox with a label. The checkbox and the label are siblings
 * inside a flex row so the click target spans both.
 *
 *   <Checkbox checked={agreed} onChange={…}>I agree to the terms</Checkbox>
 */
type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> & {
  children?: ReactNode;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { children, id, style, ...rest },
  ref
) {
  return (
    <label
      htmlFor={id}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        fontSize: 13,
        color: "var(--text)",
        userSelect: "none",
        ...style
      }}
    >
      <input ref={ref} id={id} type="checkbox" {...rest} />
      {children ? <span>{children}</span> : null}
    </label>
  );
});
