import { listActiveFaqEntries } from "@airegistry/core/services/public-cms";
import { getTranslations } from "next-intl/server";
import { FaqClient, type FaqClientItem } from "./Faq.client";

function fallbackFaqs(t: (key: string, values?: Record<string, string>) => string): FaqClientItem[] {
  return [
    { question: t("faq1Q"), answer: t("faq1A") },
    { question: t("faq2Q"), answer: t("faq2A") },
    { question: t("faq3Q"), answer: t("faq3A") },
    { question: t("faq4Q"), answer: t("faq4A") },
    { question: t("faq5Q"), answer: t("faq5A") }
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
  const t = await getTranslations("faq");
  const fallback = fallbackFaqs(t);
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
