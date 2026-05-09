import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/public/sections/PageHero";
import { CONTACT_TOPIC_LABELS, type ContactTopicCode } from "@/lib/contacts/topics";

export const metadata = { title: "Provider portal" };

function topicLabel(code: string): string {
  return CONTACT_TOPIC_LABELS[code as ContactTopicCode] ?? code;
}

export default async function PortalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portal");

  const verifiedContacts = await prisma.contact.findMany({
    where: { linkedUserId: user.id, emailVerified: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      topic: true,
      message: true,
      senderName: true,
      organisationName: true,
      createdAt: true
    }
  });

  return (
    <div>
      <PageHero
        crumb="Portal · Signed in"
        title={
          <>
            Welcome back, <span className="gradient-text">{user.name}</span>.
          </>
        }
        subtitle={
          `Signed in as ${user.email}` +
          (user.emailVerified ? "" : " · your account email is not verified yet")
        }
      />

      <section className="section" style={{ paddingTop: 24, paddingBottom: 80 }}>
      <div className="glass" style={{ padding: 32, maxWidth: 800, margin: "0 auto" }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Verified contact messages</h2>
        <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 20 }}>
          Messages you sent through the public contact form appear here after you confirm the email
          link we send you, using the same address as this account.
        </p>
        {verifiedContacts.length === 0 ? (
          <p style={{ color: "var(--text-2)", fontSize: 14 }}>
            No verified messages yet.{" "}
            <Link href="/contact" style={{ color: "var(--accent)" }}>
              Contact the operator
            </Link>{" "}
            and click the confirmation link in the auto-reply.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
            {verifiedContacts.map((row) => (
              <li
                key={row.id}
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: 16
                }}
              >
                <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>
                  {new Date(row.createdAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short"
                  })}{" "}
                  · {topicLabel(row.topic)}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 8 }}>
                  {row.senderName} · {row.organisationName}
                </div>
                <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{row.message}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      </section>
    </div>
  );
}
