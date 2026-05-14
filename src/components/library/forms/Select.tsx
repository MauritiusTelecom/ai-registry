import { forwardRef, type SelectHTMLAttributes, type ReactNode } from "react";

/**
 * Native `<select>` wrapped with the shared `.p-input .p-select` styling.
 * Children are the standard `<option>` elements.
 *
 *   <Select id="kind" name="kind" value={kind} onChange={…}>
 *     <option value="">Select…</option>
 *     <option value="model">Model</option>
 *     <option value="agent">Agent</option>
 *   </Select>
 */
type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      {...rest}
      className={`p-input p-select${className ? ` ${className}` : ""}`}
    >
      {children}
    </select>
  );
});
