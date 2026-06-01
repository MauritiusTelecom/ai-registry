import { Link } from "@/i18n/navigation";
import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconName } from "../chrome/Icon";

/**
 * Inline "label →" CTA link. Lighter-weight than `Button` - no background,
 * just text + trailing arrow. Used inside cards and in body copy where
 * a full button would be visually heavy.
 *
 *   <LinkButton href="/registry">Browse the registry</LinkButton>
 */
export function LinkButton({
  href,
  children,
  trailingIcon = "arrow-right",
  external,
  tone = "default",
  size = 13,
  className,
  style
}: {
  href: string;
  children: ReactNode;
  trailingIcon?: IconName | null;
  external?: boolean;
  tone?: "default" | "primary" | "muted";
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const isExternal = external ?? /^https?:/i.test(href);
  const colorMap = {
    default: "var(--text)",
    primary: "var(--primary)",
    muted: "var(--text-2)"
  };

  const composed: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: size,
    fontWeight: 500,
    color: colorMap[tone],
    textDecoration: "none",
    ...style
  };

  const content = (
    <>
      <span>{children}</span>
      {trailingIcon ? <Icon name={trailingIcon} size={size + 1} /> : null}
    </>
  );

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={composed}
      >
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={className} style={composed}>
      {content}
    </Link>
  );
}
