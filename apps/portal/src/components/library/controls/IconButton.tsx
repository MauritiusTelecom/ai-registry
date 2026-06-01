"use client";

import type { ButtonHTMLAttributes, CSSProperties } from "react";
import { Icon, type IconName } from "../chrome/Icon";

/**
 * Square icon-only button. Requires an `aria-label` so screen readers can
 * announce the action. Picks one of three visual treatments:
 *   - ghost   (default) - transparent until hover
 *   - subtle  - filled with `.p-input` background
 *   - solid   - tinted with the primary brand
 */

type Variant = "ghost" | "subtle" | "solid";

type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "type"
> & {
  icon: IconName;
  ["aria-label"]: string;
  size?: number;
  iconSize?: number;
  variant?: Variant;
  type?: "button" | "submit" | "reset";
  style?: CSSProperties;
};

export function IconButton({
  icon,
  size = 32,
  iconSize,
  variant = "ghost",
  style,
  type = "button",
  ...rest
}: IconButtonProps) {
  const inner = iconSize ?? Math.round(size * 0.5);
  const palette: Record<Variant, CSSProperties> = {
    ghost: {
      background: "transparent",
      color: "var(--text-2)",
      border: "1px solid transparent"
    },
    subtle: {
      background: "var(--input-bg, rgba(255,255,255,0.04))",
      color: "var(--text)",
      border: "1px solid var(--border)"
    },
    solid: {
      background: "rgba(var(--primary-rgb), 0.16)",
      color: "var(--primary)",
      border: "1px solid rgba(var(--primary-rgb), 0.35)"
    }
  };
  return (
    <button
      {...rest}
      type={type}
      style={{
        width: size,
        height: size,
        display: "inline-grid",
        placeItems: "center",
        borderRadius: 8,
        cursor: "pointer",
        transition: "background 160ms, color 160ms, border-color 160ms",
        ...palette[variant],
        ...style
      }}
    >
      <Icon name={icon} size={inner} />
    </button>
  );
}
