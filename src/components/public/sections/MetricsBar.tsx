"use client";

import { useCountUp } from "../useCountUp";

type Metric = {
  label: string;
  target: number;
  suffix: string;
  trend: string;
};

const METRICS: Metric[] = [
  { label: "Listed Resources", target: 247, suffix: "", trend: "+12 this month" },
  { label: "Verified Providers", target: 89, suffix: "", trend: "+4 this week" },
  { label: "Uptime", target: 99.97, suffix: "%", trend: "90-day SLO" },
  { label: "Jurisdictions", target: 12, suffix: "", trend: "national rollout" }
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
  return (
    <div className="metrics-bar">
      <div className="metrics-grid">
        {METRICS.map((metric) => (
          <MetricCell key={metric.label} {...metric} />
        ))}
      </div>
    </div>
  );
}
