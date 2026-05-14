import { Icon, type IconName } from "./Icon";

/**
 * Small coloured square wrapping an Icon. Encapsulates the
 * `rgba(<tone-rgb>, 0.12)` background + `<tone>` foreground + tinted-border
 * pattern that the public-site sections repeat for every audience / role /
 * integrator card.
 *
 * Tones map to CSS token pairs:
 *   - primary   → --primary / --primary-rgb
 *   - secondary → --secondary / --secondary-rgb
 *   - tertiary  → --tertiary / --tertiary-rgb
 *   - emerald   → hard-coded #10b981 / 16,185,129 (success accent)
 */

export type Tone = "primary" | "secondary" | "tertiary" | "emerald";

const TONE_VARS: Record<Tone, { rgb: string; color: string }> = {
  primary: { rgb: "var(--primary-rgb)", color: "var(--primary)" },
  secondary: { rgb: "var(--secondary-rgb)", color: "var(--secondary)" },
  tertiary: { rgb: "var(--tertiary-rgb)", color: "var(--tertiary)" },
  emerald: { rgb: "16, 185, 129", color: "#10b981" }
};

export function IconTile({
  name,
  tone = "primary",
  size = 38,
  iconSize,
  stroke = 1.8,
  marginBottom = 12
}: {
  name: IconName;
  tone?: Tone;
  /** Outer tile size in px. */
  size?: number;
  /** Inner icon size in px. Defaults to ~half the tile size. */
  iconSize?: number;
  stroke?: number;
  /** Spacing below the tile. Pass 0 when composing horizontally. */
  marginBottom?: number;
}) {
  const t = TONE_VARS[tone];
  const radius = size <= 28 ? 8 : 10;
  const inner = iconSize ?? Math.round(size * 0.47);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        display: "grid",
        placeItems: "center",
        background: `rgba(${t.rgb}, 0.12)`,
        color: t.color,
        border: `1px solid rgba(${t.rgb}, 0.30)`,
        marginBottom,
        flexShrink: 0
      }}
    >
      <Icon name={name} size={inner} stroke={stroke} />
    </div>
  );
}
