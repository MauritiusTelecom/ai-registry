"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

/**
 * Sign-out button. Calls POST /api/auth/logout and then hard-navigates to
 * `next` (default "/") so the server reads the cleared cookie on the next
 * request.
 */
export function LogoutButton({ next = "/" }: { next?: string }) {
  const t = useTranslations("common");
  const [busy, setBusy] = useState(false);
  async function onClick() {
    setBusy(true);
    try {
      await registryFetch(withBase("/api/auth/logout"), { method: "POST" });
    } finally {
      window.location.assign(withBase(next));
    }
  }
  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={onClick}
      disabled={busy}
    >
      {busy ? t("signingOut") : t("signOut")}
    </button>
  );
}

