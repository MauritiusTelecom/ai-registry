/**
 * Server component. Renders the provider's verification-status card on
 * /provider/settings — one row per applicable requirement, with the
 * current pill (verified / pending / rejected / missing) and any
 * verifier note.
 *
 * Auto-creates ProviderVerification rows for missing requirements on
 * load so the card always reflects the current applicability matrix.
 */

import { getCurrentUser } from "@airegistry/sdk/server";
import { ensurePluginsLoaded } from "@airegistry/plugin-host";
import {
  ensureVerificationRowsForProvider,
  loadVerificationStatusForProvider
} from "@airegistry/core/services/verification";

export default async function ProviderVerificationStatusCard() {
  const user = await getCurrentUser();
  if (!user?.provider?.id) return null;

  await ensurePluginsLoaded();
  await ensureVerificationRowsForProvider(user.provider.id);
  const status = await loadVerificationStatusForProvider(user.provider.id);

  if (status.applicable.length === 0) return null;

  return (
    <div
      className="glass"
      style={{ padding: 22, maxWidth: 720, display: "grid", gap: 14 }}
    >
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 4 }}>
          Verification status
        </h2>
        <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: 0 }}>
          Your provider profile and resources become publicly visible once every
          requirement below is verified by the operator.
        </p>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
        {status.applicable.map((r) => (
          <li
            key={`${r.extensionId}::${r.requirementCode}`}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 12,
              alignItems: "start",
              padding: "10px 12px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--hairline)",
              borderRadius: 6
            }}
          >
            <StatusBadge status={r.status} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</div>
              {r.status === "verified" && r.verifiedAt ? (
                <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
                  Verified on {r.verifiedAt.toISOString().slice(0, 10)}
                </div>
              ) : null}
              {r.status === "rejected" && r.rejectionNote ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "#ff8a95",
                    background: "rgba(220, 38, 38, 0.08)",
                    border: "1px solid rgba(220, 38, 38, 0.25)",
                    borderRadius: 4,
                    padding: "6px 8px",
                    marginTop: 6
                  }}
                >
                  <strong>Reviewer note:</strong> {r.rejectionNote}
                </div>
              ) : null}
              {r.status === "pending" && r.documentTypeHint ? (
                <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
                  Speeds up review: upload a <code>{r.documentTypeHint}</code> document
                  under Verification documents below.
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div
        style={{
          fontSize: 12,
          color: status.isFullyVerified ? "#6ddf91" : "var(--text-3)",
          fontWeight: 600
        }}
      >
        {status.isFullyVerified
          ? "✓ All requirements verified — your profile is publicly listed."
          : "Awaiting one or more verifications before public listing."}
      </div>
    </div>
  );
}

function StatusBadge({
  status
}: {
  status: "verified" | "pending" | "rejected" | "missing";
}) {
  const map = {
    verified: { bg: "#16a34a", text: "Verified" },
    pending: { bg: "#a16207", text: "Pending" },
    rejected: { bg: "#dc2626", text: "Rejected" },
    missing: { bg: "#475569", text: "Missing" }
  } as const;
  const { bg, text } = map[status];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        background: bg,
        color: "#fff",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        alignSelf: "start"
      }}
    >
      {text}
    </span>
  );
}
