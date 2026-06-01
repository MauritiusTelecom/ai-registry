import { forwardRef, type InputHTMLAttributes } from "react";

/**
 * Thin wrapper around `<input>` that applies the shared `.p-input` styling
 * and forwards the ref so form libraries (react-hook-form, etc.) can attach.
 *
 * Pass `mono` to switch to the monospace family used for codes / slugs.
 */

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  mono?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { mono, className, style, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      {...rest}
      className={`p-input${className ? ` ${className}` : ""}`}
      style={{
        ...(mono ? { fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 } : null),
        ...style
      }}
    />
  );
});
