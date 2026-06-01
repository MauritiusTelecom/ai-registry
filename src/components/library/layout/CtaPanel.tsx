import type { ReactNode } from "react";

/**
 * Large closing call-to-action panel - the radial-gradient block that ends
 * the `/ecosystem`, `/contact`, `/governance` and home-page tours.
 *
 *   <CtaPanel
 *     title={<>Build the <Gradient>sovereign discovery layer</Gradient><br/>for your country.</>}
 *     body="Open code. Local control. Sovereign discovery."
 *     actions={<Button as={Link} href="/contact" intent="primary" trailingIcon="arrow-right">Talk to the team</Button>}
 *   />
 *
 * Pass the action(s) as a ReactNode so the panel doesn't need to know
 * about Button / Link / external-link semantics.
 */
export function CtaPanel({
  title,
  body,
  actions,
  maxBodyWidth = 580
}: {
  title: ReactNode;
  body?: ReactNode;
  actions?: ReactNode;
  /** Max width of the body paragraph in px (centred). */
  maxBodyWidth?: number;
}) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "48px 32px",
        borderRadius: 20,
        border: "1px solid var(--border-strong)",
        background:
          "radial-gradient(600px 320px at 50% 0%, rgba(var(--primary-rgb),0.18), transparent 60%), " +
          "radial-gradient(600px 320px at 100% 100%, rgba(var(--tertiary-rgb),0.14), transparent 60%), " +
          "var(--panel)",
        textAlign: "center"
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 32,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          lineHeight: 1.2
        }}
      >
        {title}
      </h2>
      {body ? (
        <p
          style={{
            maxWidth: maxBodyWidth,
            margin: "16px auto 28px",
            color: "var(--text-2)",
            fontSize: 15,
            lineHeight: 1.55
          }}
        >
          {body}
        </p>
      ) : null}
      {actions ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "center"
          }}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
