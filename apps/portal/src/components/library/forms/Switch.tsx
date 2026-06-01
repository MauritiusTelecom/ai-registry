"use client";

/**
 * iOS-style toggle switch. Ported from the prototype's `InlineSwitch`.
 * Uses the `.p-switch` class from `globals.css` for the visual.
 *
 *   <Switch checked={visible} onChange={setVisible} aria-label="Visibility" />
 */
export function Switch({
  checked,
  onChange,
  disabled,
  ariaLabel
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <span
      className={`p-switch ${checked ? "on" : ""}${disabled ? " disabled" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      aria-label={ariaLabel}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      style={{ cursor: disabled ? "not-allowed" : "pointer" }}
    >
      <span className="p-switch-track">
        <span className="p-switch-thumb" />
      </span>
    </span>
  );
}
