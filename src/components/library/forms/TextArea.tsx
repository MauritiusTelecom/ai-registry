import { forwardRef, type TextareaHTMLAttributes } from "react";

/**
 * `<textarea>` wrapper that applies `.p-input` styling for consistency
 * with the other form controls.
 */
type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ className, rows = 3, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        {...rest}
        className={`p-input${className ? ` ${className}` : ""}`}
      />
    );
  }
);
