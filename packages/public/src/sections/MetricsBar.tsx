"use client";

import { useTranslations } from "next-intl";
import { useCountUp } from "../shell/useCountUp";
import { usePublicBranding } from "../lib/branding-context";

type Metric = {
  label: string;
  target: number;
  suffix: string;
  trend: string;
};

function MetricCell({ label, target, suffix, trend }: Metric) {
  const isFloat = suffix === "%";
  const value = useCountUp(isFloat ? Math.round(target * 100) : target, 1600);
  const display = isFloat ? (value / 100).toFixed(2) : value.toLocaleString();
  return (
    <div className="metric-cell">
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {display}
        {suffix}
      </div>
      <div className="metric-trend">{trend}</div>
    </div>
  );
}

export function MetricsBar() {
  const t = useTranslations("metrics");
  const { operatorName } = usePublicBranding();
  const metrics: Metric[] = [
    { label: t("listedResources"), target: 7, suffix: "", trend: t("liveCatalogue") },
    { label: t("verifiedProviders"), target: 1, suffix: "", trend: operatorName },
    { label: t("uptime"), target: 99.97, suffix: "%", trend: t("slo") },
    { label: t("jurisdictions"), target: 1, suffix: "", trend: "MU" }
  ];
  return (
    <div className="metrics-bar">
      <div className="metrics-grid">
        {metrics.map((metric) => (
          <MetricCell key={metric.label} {...metric} />
        ))}
      </div>
    </div>
  );
}
