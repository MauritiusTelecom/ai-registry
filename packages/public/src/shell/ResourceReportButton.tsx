"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@airegistry/ui-kit";
import { useReport, type ReportTarget } from "./ReportContext";

// Standalone Report button for the resource detail page. Cards used to
// carry it too; now reporting only happens once you've opened the listing,
// so it lives here instead.

export function ResourceReportButton({ target }: { target: ReportTarget }) {
  const t = useTranslations("reportModal");
  const { open } = useReport();
  return (
    <button
      type="button"
      className="btn btn-secondary btn-report-listing"
      onClick={() => open(target)}
    >
      <Icon name="flag" size={14} /> {t("reportListing")}
    </button>
  );
}
