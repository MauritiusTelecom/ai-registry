import { listActiveFaqEntries } from "@airegistry/core/services/public-cms";
import { FaqClient, type FaqClientItem } from "./Faq.client";

/**
 * Hardcoded fallback used when the `cms_faq_entry` table is empty - e.g. a
 * fresh deploy that hasn't run `pnpm db:seed` yet. The seed script populates
 * the same entries on bootstrap so this fallback is only seen during the
 * first request after a brand-new deploy, but keeping it as defence-in-depth
 * means the section never renders empty.
 */
const FALLBACK_FAQS: FaqClientItem[] = [
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
      "Yes. The reference implementation at airegistry.mu and the AIR-SPEC are openly licensed. Each jurisdiction operates its own instance with local governance."
  },
  {
    question: "How are listings resolved at runtime?",
    answer:
      "AIR-IDs (under air://) resolve to provider endpoints described in the listing metadata. Optionally, hosting environments issue SPIFFE/SPIRE SVIDs for runtime identity."
  }
];

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
  let items: FaqClientItem[];
  try {
    const rows = await listActiveFaqEntries();
    items = rows.length
      ? rows.map((r) => ({ question: r.question, answer: r.answer }))
      : FALLBACK_FAQS;
  } catch {
    // Defensive: a DB outage shouldn't break the marketing page.
    items = FALLBACK_FAQS;
  }
  return <FaqClient items={items} />;
}
