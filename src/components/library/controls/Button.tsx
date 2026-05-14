"use client";

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentType,
  CSSProperties,
  ReactNode
} from "react";
import { Icon, type IconName } from "../chrome/Icon";

/**
 * Universal button primitive. Renders as `<button>` by default; pass `as={Link}`
 * with `href` to render as a Next.js link, or as `as="a"` for an external link.
 *
 *   <Button intent="primary">Submit</Button>
 *   <Button as={Link} href="/contact" intent="primary" trailingIcon="arrow-right">
 *     Talk to the team
 *   </Button>
 *   <Button as="a" href="https://example.com" intent="secondary" external>
 *     Open docs
 *   </Button>
 *
 * Uses the existing `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`
 * classes from `globals.css` - styling is in the stylesheet, the component
 * just picks the right class.
 */

export type ButtonIntent = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type CommonProps = {
  intent?: ButtonIntent;
  size?: ButtonSize;
  /** Icon rendered to the left of the label. */
  leadingIcon?: IconName;
  /** Icon rendered to the right of the label (typical: arrow-right). */
  trailingIcon?: IconName;
  /** Marks an external link - adds target=_blank + rel=noopener noreferrer. */
  external?: boolean;
  /** Apply when the trailing icon should sit slightly nudged for the arrow effect. */
  block?: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

type ButtonElementProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps | "type"> & {
    as?: "button";
    /** Defaults to `"button"` to prevent unexpected form submits. */
    type?: "button" | "submit" | "reset";
  };

type AnchorElementProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps | "href"> & {
    as: "a";
    href: string;
  };

type LinkLikeProps = CommonProps & {
  as: ComponentType<{ href: string; className?: string; style?: CSSProperties; children?: ReactNode }>;
  href: string;
};

export type ButtonProps = ButtonElementProps | AnchorElementProps | LinkLikeProps;

const SIZE_PADDING: Record<ButtonSize, string> = {
  sm: "6px 12px",
  md: "10px 18px",
  lg: "12px 22px"
};

const SIZE_FONT: Record<ButtonSize, number> = {
  sm: 12.5,
  md: 14,
  lg: 15
};

function classFor(intent: ButtonIntent): string {
  switch (intent) {
    case "primary":
      return "btn btn-primary";
    case "secondary":
      return "btn btn-secondary";
    case "ghost":
      return "btn btn-ghost";
  }
}

export function Button(props: ButtonProps) {
  const {
    intent = "primary",
    size = "md",
    leadingIcon,
    trailingIcon,
    children,
    className,
    style,
    block
  } = props;

  const composed = `${classFor(intent)}${className ? ` ${className}` : ""}`;
  const composedStyle: CSSProperties = {
    display: block ? "flex" : "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: SIZE_PADDING[size],
    borderRadius: 10,
    fontSize: SIZE_FONT[size],
    fontWeight: 500,
    width: block ? "100%" : undefined,
    justifyContent: block ? "center" : undefined,
    ...style
  };

  const content = (
    <>
      {leadingIcon ? <Icon name={leadingIcon} size={size === "sm" ? 13 : 15} /> : null}
      <span>{children}</span>
      {trailingIcon ? <Icon name={trailingIcon} size={size === "sm" ? 13 : 15} /> : null}
    </>
  );

  // Anchor: external link
  if ("as" in props && props.as === "a") {
    const { external, href, ...rest } = props as AnchorElementProps;
    const ext = external ?? /^https?:/i.test(href);
    return (
      <a
        {...rest}
        href={href}
        className={composed}
        style={composedStyle}
        {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {content}
      </a>
    );
  }

  // Polymorphic: caller-supplied component (next/link, react-router Link, etc.)
  if ("as" in props && typeof props.as !== "string" && props.as) {
    const { as: As, href } = props as LinkLikeProps;
    return (
      <As href={href} className={composed} style={composedStyle}>
        {content}
      </As>
    );
  }

  // Default: native button
  const {
    as: _as,
    type = "button",
    external: _external,
    ...rest
  } = props as ButtonElementProps;
  void _as;
  void _external;
  return (
    <button {...rest} type={type} className={composed} style={composedStyle}>
      {content}
    </button>
  );
}
