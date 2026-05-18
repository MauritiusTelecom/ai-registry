"use client";

import type { ReactNode } from "react";

export function Globe({
  children,
  motionIntensity = 1
}: {
  children?: ReactNode;
  motionIntensity?: number;
}) {
  const spin = 48 / Math.max(0.25, motionIntensity);

  return (
    <div className="globe-stage" aria-hidden>
      <svg className="globe-svg" viewBox="0 0 400 400" role="presentation">
        <defs>
          <radialGradient id="home-globe-glow" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="rgba(var(--primary-rgb), 0.35)" />
            <stop offset="55%" stopColor="rgba(var(--tertiary-rgb), 0.12)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="168" fill="url(#home-globe-glow)" />
        <g
          style={{
            transformOrigin: "200px 200px",
            animation: `globe-spin ${spin}s linear infinite`
          }}
        >
          {[0, 30, 60, 90, 120, 150].map((deg) => (
            <ellipse
              key={deg}
              cx="200"
              cy="200"
              rx="168"
              ry="52"
              fill="none"
              stroke="rgba(var(--primary-rgb), 0.22)"
              strokeWidth="1"
              transform={`rotate(${deg} 200 200)`}
            />
          ))}
        </g>
        <g
          style={{
            transformOrigin: "200px 200px",
            animation: `globe-spin ${spin * 1.4}s linear infinite reverse`
          }}
        >
          {[-60, -30, 0, 30, 60].map((lat) => (
            <ellipse
              key={lat}
              cx="200"
              cy={200 + lat * 1.1}
              rx={Math.sqrt(Math.max(0, 168 * 168 - (lat * 1.8) ** 2))}
              ry="18"
              fill="none"
              stroke="rgba(var(--secondary-rgb), 0.18)"
              strokeWidth="1"
            />
          ))}
        </g>
        <circle
          cx="200"
          cy="200"
          r="168"
          fill="none"
          stroke="rgba(var(--primary-rgb), 0.45)"
          strokeWidth="1.2"
        />
      </svg>
      {children}
    </div>
  );
}
