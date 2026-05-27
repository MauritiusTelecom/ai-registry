import { getLocale } from "next-intl/server";
import { redirect } from "./navigation";

/** Server-only redirect that keeps the active UI locale in the URL. */
export async function localeRedirect(href: string): Promise<never> {
  const locale = await getLocale();
  return redirect({ href, locale });
}
