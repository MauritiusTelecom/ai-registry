"use client";

import { useCountUp } from "../shell/useCountUp";
import { usePublicBranding } from "../lib/branding-context";

type Metric = {
  label: string;
  target: number;
  suffix: string;
  trend: string;
};

const BASE_METRICS: Omit<Metric, "trend">[] = [
  { label: "Listed Resources", target: 7, suffix: "" },
  { label: "Verified Providers", target: 1, suffix: "" },
  { label: "Uptime", target: 99.97, suffix: "%" },
  { label: "Jurisdictions", target: 1, suffix: "" }
];

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
  const { operatorName } = usePublicBranding();
  const metrics: Metric[] = [
    { ...BASE_METRICS[0]!, trend: "live catalogue" },
    { ...BASE_METRICS[1]!, trend: operatorName },
    { ...BASE_METRICS[2]!, trend: "90-day SLO" },
    { ...BASE_METRICS[3]!, trend: "MU" }
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
