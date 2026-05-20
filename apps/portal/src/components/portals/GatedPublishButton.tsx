"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import { useAuth } from "@airegistry/ui-kit";
import { REGISTRATION_MSG } from "@/lib/portal/authoring-messages";

type Props = {
  /** When true, server already knows user can author - skip client gate for first paint. */
  href: string;
  canAuthorResources: boolean;
  /**
   * Pass the server-known `user.emailVerified` so the gated-toast picks the
   * right message even before the client-side AuthProvider has fetched
   * /api/auth/me. Without this, a freshly-verified provider would briefly
   * see "Verify your email" because `useAuth().user` is still null.
   */
  emailVerified?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Primary publish CTA: disabled look when gated, but still clickable to show guidance.
 */
export function GatedPublishButton({
  href,
  canAuthorResources,
  emailVerified,
  className,
  children
}: Props) {
  const { user, loading } = useAuth();
  const [toast, setToast] = useState<string | null>(null);

  const allowed = canAuthorResources || (!loading && user?.canAuthorResources === true);

  // Prefer the explicit server prop (always accurate at first paint). Fall
  // back to the client-hydrated useAuth value only when the prop wasn't
  // passed. If both are unknown — i.e. anonymous viewer — assume the email
  // gate isn't the blocker; we'd rather show REGISTRATION_MSG than an
  // incorrect "Verify your email" notice.
  const effectiveEmailVerified =
    typeof emailVerified === "boolean"
      ? emailVerified
      : user?.emailVerified ?? true;

  const showBlocked = useCallback(() => {
    if (!effectiveEmailVerified) {
      setToast("Verify your email address first. Use the banner link or visit the verification page.");
      return;
    }
    setToast(REGISTRATION_MSG);
  }, [effectiveEmailVerified]);

  if (allowed) {
    return (
      <Link href={href} className={className ?? "btn btn-primary"}>
        {children}
      </Link>
    );
  }

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className={className ?? "btn btn-primary"}
        aria-disabled="true"
        style={{ opacity: 0.65, cursor: "pointer" }}
        onClick={showBlocked}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            showBlocked();
          }
        }}
      >
        {children}
      </button>
      {toast ? (
        <div
          role="alert"
          style={{
            position: "absolute",
            left: 0,
            top: "100%",
            marginTop: 8,
            zIndex: 20,
            minWidth: 280,
            maxWidth: 360,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--panel)",
            fontSize: 13,
            color: "var(--text)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)"
          }}
        >
          {toast}{" "}
          <Link href="/provider/settings" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
            Settings →
          </Link>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              marginLeft: 8,
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "var(--text-3)",
              fontSize: 12
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ) : null}
    </span>
  );
}
