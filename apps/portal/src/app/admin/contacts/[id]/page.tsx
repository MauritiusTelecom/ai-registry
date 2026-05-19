import Link from "next/link";
import { notFound } from "next/navigation";
import { CONTACT_TOPIC_LABELS } from "@airegistry/sdk";
import { ContactAdminPanel } from "@/components/admin/ContactAdminPanel";
import { loadAdminContactDetail } from "@airegistry/sdk/server";

export const metadata = { title: "Admin · Contact message" };
export const dynamic = "force-dynamic";

function labelFor(topic: string): string {
  return (CONTACT_TOPIC_LABELS as Record<string, string>)[topic] ?? topic;
}

/**
 * Admin · Contact message detail. Shows the full message and gives the
 * operator a panel to reply by email or delete the message. Reply uses the
 * sender's address as the `to` and the operator's signature comes from
 * `OPERATOR_NAME` / `REGISTRY_NAME` config values.
 */
export default async function AdminContactDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const contact = await loadAdminContactDetail(id);

  if (!contact) notFound();

  return (
    <div className="p-content">
      <div className="p-page-header">
        <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>
          <Link href="/admin" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            Admin
          </Link>{" "}
          ·{" "}
          <Link href="/admin/contacts" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            Contacts
          </Link>{" "}
          · {contact.id.slice(0, 8)}
        </div>
        <h1 className="p-title">Contact · {labelFor(contact.topic)}</h1>
        <p className="p-subtitle">
          Received {contact.createdAt.toISOString().slice(0, 10)} ·{" "}
          {contact.emailVerified ? (
            <span style={{ color: "#22c55e" }}>email verified</span>
          ) : (
            <span style={{ color: "var(--text-3)" }}>email unverified</span>
          )}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "minmax(0, 1fr) 360px",
          alignItems: "start"
        }}
      >
        <div style={{ display: "grid", gap: 18 }}>
          <Card title="Sender">
            <KeyVal label="Name">{contact.senderName}</KeyVal>
            <KeyVal label="Organisation">{contact.organisationName}</KeyVal>
            <KeyVal label="Email">
              <a
                href={`mailto:${contact.email}`}
                style={{ color: "var(--text)", textDecoration: "underline" }}
              >
                {contact.email}
              </a>
            </KeyVal>
            {contact.linkedUser ? (
              <KeyVal label="Linked user">
                {contact.linkedUser.name} ({contact.linkedUser.email})
              </KeyVal>
            ) : null}
          </Card>

          <Card title="Message">
            <div
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
                fontSize: 14,
                color: "var(--text)"
              }}
            >
              {contact.message}
            </div>
          </Card>

          {contact.ipAddress || contact.userAgent ? (
            <Card title="Metadata">
              {contact.ipAddress ? <KeyVal label="IP">{contact.ipAddress}</KeyVal> : null}
              {contact.userAgent ? (
                <KeyVal label="User agent">
                  <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}>
                    {contact.userAgent}
                  </span>
                </KeyVal>
              ) : null}
            </Card>
          ) : null}
        </div>

        <ContactAdminPanel
          contactId={contact.id}
          recipientEmail={contact.email}
          recipientName={contact.senderName}
          topic={labelFor(contact.topic)}
        />
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "18px 20px"
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--text-3)",
          marginBottom: 12
        }}
      >
        {title}
      </div>
      <div style={{ display: "grid", gap: 8 }}>{children}</div>
    </div>
  );
}

function KeyVal({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, fontSize: 13.5 }}>
      <span style={{ color: "var(--text-3)" }}>{label}</span>
      <span style={{ color: "var(--text)" }}>{children}</span>
    </div>
  );
}
