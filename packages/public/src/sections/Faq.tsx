import { getBranding } from "@airegistry/core/branding";
import { listActiveFaqEntries } from "@airegistry/core/services/public-cms";
import { FaqClient, type FaqClientItem } from "./Faq.client";

function fallbackFaqs(portalDomain: string): FaqClientItem[] {
  return [
  {
    question: "Does the registry host any AI?",
    answer:
      "No. The registry only points. Providers operate their own resources, and hosting environments run the workloads. The registry is never on the runtime path."
  },
  {
    question: "How is sovereignty defined?",
    answer:
      "A submission must cite at least one of: local law, local data, local systems, or local language and culture - with concrete evidence such as a referenced statute, dataset, or institutional integration."
  },
  {
    question: 'What does "verified" mean?',
    answer:
      "Provider verification confirms that the listing is bound to the rightful operator via DNS and email proofs. It does not imply endorsement of the resource itself."
  },
  {
    question: "Who can submit a resource?",
    answer:
      "Any organisation or accredited individual that operates a sovereign AI resource can submit. Government endorsement is a separate, stronger signal granted only by the responsible authority."
  },
  {
    question: "Is the platform open source?",
    answer:
      `Yes. The reference implementation at ${portalDomain} and the AIR-SPEC are openly licensed. Each jurisdiction operates its own instance with local governance.`
  },
  {
    question: "How are listings resolved at runtime?",
    answer:
      "AIR-IDs (under air://) resolve to provider endpoints described in the listing metadata. Optionally, hosting environments issue SPIFFE/SPIRE SVIDs for runtime identity."
  }
  ];
}

/**
 * FAQ section. Server-rendered: reads from the `cms_faq_entry` table via
 * `@airegistry/core/services/public-cms` and passes the rows down to a
 * client-side accordion (`FaqClient`). If the table is empty or the DB
 * is unreachable, falls back to the same defaults as the seed so the
 * section never renders empty.
 *
 * Edited from the admin workspace at /admin/site/faq.
 */
export async function Faq() {
  const { portalDomain } = await getBranding();
  const fallback = fallbackFaqs(portalDomain);
  let items: FaqClientItem[];
  try {
    const rows = await listActiveFaqEntries();
    items = rows.length
      ? rows.map((r) => ({ question: r.question, answer: r.answer }))
      : fallback;
  } catch {
    // Defensive: a DB outage shouldn't break the marketing page.
    items = fallback;
  }
  return <FaqClient items={items} />;
}
