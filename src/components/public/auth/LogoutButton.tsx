"use client";

import { useState } from "react";

/**
 * Sign-out button. Calls POST /api/auth/logout and then hard-navigates to /
 * so the server reads the cleared cookie on the next request.
 */
export function LogoutButton({ next = "/" }: { next?: string }) {
  const [busy, setBusy] = useState(false);
  async function onClick() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign(next);
    }
  }
  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={onClick}
      disabled={busy}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
