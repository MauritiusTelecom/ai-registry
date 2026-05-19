import { getCurrentUser } from "@airegistry/sdk/server";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Provider · Contact requests" };
export const dynamic = "force-dynamic";

/**
 * Contact form submissions linked to verified members of this provider's
 * team. Scoping invariant:
 *
 *   linkedUser.providerId === user.provider.id  AND  emailVerified === true
 *
 * Verified messages only - pre-verification rows live in the operator's
 * inbox until the sender confirms their address.
 */

export default async function ProviderContactRequestsPage() {
  const user = await getCurrentUser();
  const providerId = user?.provider?.id ?? null;

  if (!providerId) {
    return (
      <div className="p-content">
        <div className="p-page-header">
          <h1 className="p-title">Contact requests</h1>
          <p className="p-subtitle">Your account isn't linked to a provider yet.</p>
        </div>
        <div className="p-empty">
          <div className="p-empty-text">No provider linkage on this account.</div>
        </div>
      </div>
    );
  }

  const rows = await prisma.contact.findMany({
    where: {
      emailVerified: true,
      linkedUser: { providerId }
    },
    select: {
      id: true,
      senderName: true,
      organisationName: true,
      email: true,
      topic: true,
      message: true,
      createdAt: true,
      linkedUser: { select: { name: true, email: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  if (rows.length === 0) {
    return (
      <div className="p-content">
        <div className="p-page-header">
          <h1 className="p-title">Contact requests</h1>
          <p className="p-subtitle">
            Verified contact-form submissions from members of {user?.provider?.displayName}.
          </p>
        </div>
        <div className="p-empty">
          <div className="p-empty-text">
            No verified contact requests yet. When a team member fills the public contact
            form and confirms their email, the message lands here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Contact requests</h1>
        <p className="p-subtitle">
          {rows.length} verified message{rows.length === 1 ? "" : "s"} from members of{" "}
          {user?.provider?.displayName}.
        </p>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>
        {rows.map((r) => (
          <li
            key={r.id}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "18px 20px"
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "baseline",
                marginBottom: 8,
                flexWrap: "wrap"
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
                {r.senderName}
              </span>
              <span
                style={{
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 12,
                  color: "var(--text-3)"
                }}
              >
                {r.email}
              </span>
              <span className="tag">{r.topic}</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 11,
                  color: "var(--text-3)"
                }}
              >
                {r.createdAt.toISOString().slice(0, 10)}
              </span>
            </div>
            <div style={{ fontSize: 13.5, color: "var(--text-2)", marginBottom: 10 }}>
              {r.organisationName}
            </div>
            <div style={{ fontSize: 14, color: "var(--text)", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
              {r.message}
            </div>
            {r.linkedUser ? (
              <div
                style={{
                  marginTop: 10,
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 11,
                  color: "var(--text-3)"
                }}
              >
                Linked to team member: {r.linkedUser.name} ({r.linkedUser.email})
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
