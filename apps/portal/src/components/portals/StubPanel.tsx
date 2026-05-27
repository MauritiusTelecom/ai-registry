import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

/**
 * Stub panel rendered on the per-portal sub-routes whose full
 * implementation is scheduled for Phase 4 / 5. Surfaces the route's spec
 * link so a contributor can pick it up without hunting through the spec
 * tree.
 */
export async function StubPanel({
  area,
  specHref
}: {
  area: string;
  specHref: string;
}) {
  const t = await getTranslations("portalStub");
  return (
    <div className="p-stub">
      <div className="p-stub-eyebrow">{t("eyebrow")}</div>
      <div className="p-stub-title">
        {t("title", { area })}
      </div>
      <p className="p-stub-body">
        {t("body")}
      </p>
      <Link href={specHref} className="p-stub-link">
        {t("moduleContract", { href: specHref })}
      </Link>
    </div>
  );
}
