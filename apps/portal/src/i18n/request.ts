import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/** Only `fr` has a full bundle; other UI locales reuse English (test / stub locales). */
async function loadMessages(locale: string): Promise<Record<string, unknown>> {
  if (locale === "fr") {
    return (await import("../../messages/fr.json")).default;
  }
  return (await import("../../messages/en.json")).default;
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  const messages = await loadMessages(locale);

  return {
    locale,
    messages
  };
});
