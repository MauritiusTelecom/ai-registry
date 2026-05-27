"use client";

import { Link } from "@/i18n/navigation";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { Icon, type IconName } from "../chrome/Icon";

/**
 * Universal button primitive.
 *
 *   <Button onClick={...}>Save</Button>
 *     -> <button type="button" onClick=...>
 *
 *   <Button href="/contact">Contact</Button>
 *     -> <Link href="/contact"> from next/link
 *
 *   <Button href="https://example.com">Open</Button>
 *     -> <a target=_blank rel=noopener>
 *
 *   <Button href="/x" external>Open</Button>
 *     -> forces the <a target=_blank> branch
 *
 * Server-component-safe: only strings cross the props boundary. Earlier
 * versions accepted `as={Link}`; that was removed because passing a
 * function from a Server Component to a Client Component is not allowed.
 *
 * Visual is owned by the `.btn`, `.btn-primary`, `.btn-secondary`,
 * `.btn-ghost` classes in `globals.css`; this primitive only picks the
 * class and forwards events.
 */

export type ButtonIntent = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  intent?: ButtonIntent;
  size?: ButtonSize;
  /** Icon rendered to the left of the label. */
  leadingIcon?: IconName;
  /** Icon rendered to the right of the label. */
  trailingIcon?: IconName;
  /** Stretch to fill the parent's width. */
  block?: boolean;
  /** When `href` is given, internal vs external is auto-detected from
   *  the `https?://` prefix. Set explicitly to override. */
  href?: string;
  external?: boolean;
  /** Native button props (ignored on the link branch). */
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  ["aria-label"]?: string;
  title?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

const PAD: Record<ButtonSize, string> = {
  sm: "6px 12px",
  md: "10px 18px",
  lg: "12px 22px"
};

const FONT: Record<ButtonSize, number> = {
  sm: 12.5,
  md: 14,
  lg: 15
};

function intentClass(intent: ButtonIntent): string {
  if (intent === "primary") return "btn btn-primary";
  if (intent === "secondary") return "btn btn-secondary";
  return "btn btn-ghost";
}

export function Button(props: ButtonProps) {
  const {
    intent = "primary",
    size = "md",
    leadingIcon,
    trailingIcon,
    block,
    href,
    external,
    type = "button",
    disabled,
    onClick,
    children,
    className,
    style,
    title
  } = props;
  const ariaLabel = props["aria-label"];

  const cls = `${intentClass(intent)}${className ? ` ${className}` : ""}`;
  const css: CSSProperties = {
    display: block ? "flex" : "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: PAD[size],
    borderRadius: 10,
    fontSize: FONT[size],
    fontWeight: 500,
    width: block ? "100%" : undefined,
    justifyContent: block ? "center" : undefined,
    textDecoration: "none",
    ...style
  };

  const inner = (
    <>
      {leadingIcon ? <Icon name={leadingIcon} size={size === "sm" ? 13 : 15} /> : null}
      <span>{children}</span>
      {trailingIcon ? <Icon name={trailingIcon} size={size === "sm" ? 13 : 15} /> : null}
    </>
  );

  if (href) {
    const isExternal = external ?? /^https?:/i.test(href);
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cls}
          style={css}
          aria-label={ariaLabel}
          title={title}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} style={css} aria-label={ariaLabel} title={title}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={cls}
      style={css}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
    >
      {inner}
    </button>
  );
}
