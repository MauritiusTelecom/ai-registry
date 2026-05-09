"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type GlobeProps = {
  motionIntensity?: number;
};

type Projected = { x: number; y: number; z: number; visible: boolean };

function stableCoord(value: number) {
  return Number(value.toFixed(4));
}

function project(lat: number, lon: number, rotation: number, R: number): Projected {
  const x3 = Math.cos(lat) * Math.sin(lon + rotation);
  const y3 = Math.sin(lat);
  const z3 = Math.cos(lat) * Math.cos(lon + rotation);
  return {
    x: stableCoord(x3 * R),
    y: stableCoord(-y3 * R),
    z: z3,
    visible: z3 > -0.05
  };
}

function arcPath(p1: Projected, p2: Projected, R: number, lift = 1.3) {
  const mx = stableCoord((p1.x + p2.x) / 2);
  const my = stableCoord((p1.y + p2.y) / 2);
  const len = Math.hypot(mx, my) || 1;
  const cx = stableCoord((mx / len) * R * lift);
  const cy = stableCoord((my / len) * R * lift);
  return `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`;
}

export function Globe({ motionIntensity = 1 }: GlobeProps) {
  const [rot, setRot] = useState(0);
  const rafRef = useRef<number | null>(null);
  const speed = 0.0003 + (motionIntensity / 100) * 0.0008;

  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setRot((r) => r + dt * speed);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [speed]);

  const R = 200;
  const cx = 300;
  const cy = 300;

  const nodes = useMemo(
    () => [
      { lat: 0.9, lon: -0.5 }, { lat: 0.7, lon: 0.2 }, { lat: 0.6, lon: 1.4 },
      { lat: -0.3, lon: -1.2 }, { lat: 0.2, lon: 0.7 }, { lat: -0.6, lon: 2.2 },
      { lat: 0.4, lon: -2.8 }, { lat: 1.0, lon: 2.6 }, { lat: -0.1, lon: -2.0 },
      { lat: 0.55, lon: 1.9 }
    ],
    []
  );

  const [arcs, setArcs] = useState<{ a: number; b: number; id: string }[]>([]);
  useEffect(() => {
    const interval = Math.max(2400, 5000 - motionIntensity * 25);
    const tick = () => {
      const a = Math.floor(Math.random() * nodes.length);
      let b = Math.floor(Math.random() * nodes.length);
      if (b === a) b = (b + 1) % nodes.length;
      const id = Math.random().toString(36).slice(2);
      setArcs((prev) => [...prev.slice(-3), { a, b, id }]);
    };
    const handle = window.setInterval(tick, interval);
    tick();
    return () => window.clearInterval(handle);
  }, [motionIntensity, nodes.length]);

  const lats = [-0.9, -0.45, 0, 0.45, 0.9];
  const lons = useMemo(
    () => Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2),
    []
  );

  const dotField = useMemo(() => {
    const out: { lat: number; lon: number }[] = [];
    for (let lat = -Math.PI / 2 + 0.2; lat <= Math.PI / 2 - 0.2; lat += 0.18) {
      const ringDots = Math.max(6, Math.floor(Math.cos(lat) * 32));
      for (let i = 0; i < ringDots; i++) {
        out.push({ lat, lon: (i / ringDots) * Math.PI * 2 });
      }
    }
    return out;
  }, []);

  return (
    <svg className="globe-svg" viewBox="0 0 600 600" aria-hidden>
      <defs>
        <radialGradient id="globe-glow-outer" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="rgba(var(--primary-rgb),0)" />
          <stop offset="55%" stopColor="rgba(var(--primary-rgb),0.10)" />
          <stop offset="80%" stopColor="rgba(var(--tertiary-rgb),0.06)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="sphere-fill" cx="38%" cy="32%" r="80%">
          <stop offset="0%" stopColor="rgba(80,110,160,0.35)" />
          <stop offset="55%" stopColor="rgba(20,28,46,0.85)" />
          <stop offset="100%" stopColor="rgba(8,12,20,0.95)" />
        </radialGradient>
        <linearGradient id="border-grad" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(13)">
          <stop offset="0%" stopColor="rgba(var(--primary-rgb), 0.95)" />
          <stop offset="100%" stopColor="rgba(var(--tertiary-rgb), 0.95)" />
        </linearGradient>
        <linearGradient id="arc-grad" x1="0" y1="0" x2="1" y2="0" gradientTransform="rotate(13)">
          <stop offset="0%" stopColor="rgba(var(--primary-rgb),0)" />
          <stop offset="50%" stopColor="rgba(var(--secondary-rgb),0.95)" />
          <stop offset="100%" stopColor="rgba(var(--tertiary-rgb),0)" />
        </linearGradient>
        <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx={cx} cy={cy} r={R + 70} fill="url(#globe-glow-outer)" />

      <circle cx={cx} cy={cy} r={R + 4} fill="none" stroke="url(#border-grad)" strokeWidth="1.4" opacity="0.85">
        <animate attributeName="opacity" values="0.55;0.95;0.55" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={R + 4} fill="none" stroke="url(#border-grad)" strokeWidth="6" opacity="0.18" filter="url(#soft-glow)" />

      <circle cx={cx} cy={cy} r={R} fill="url(#sphere-fill)" stroke="rgba(140,170,220,0.18)" strokeWidth="0.8" />

      <g transform={`translate(${cx} ${cy})`} opacity="0.55">
        {lats.map((lat, i) => {
          const r = stableCoord(Math.cos(lat) * R);
          const yOff = stableCoord(-Math.sin(lat) * R);
          return (
            <ellipse
              key={`lat-${i}`}
              cx={0}
              cy={yOff}
              rx={r}
              ry={r * 0.16}
              fill="none"
              stroke="rgba(140,170,220,0.16)"
              strokeWidth="0.6"
              strokeDasharray="2 5"
            />
          );
        })}
        {lons.map((lon, i) => {
          const rx = stableCoord(Math.abs(Math.sin(lon + rot)) * R);
          if (rx < 0.5) return null;
          return (
            <ellipse
              key={`lon-${i}`}
              cx={0}
              cy={0}
              rx={rx}
              ry={R}
              fill="none"
              stroke="rgba(140,170,220,0.10)"
              strokeWidth="0.6"
            />
          );
        })}
      </g>

      <g transform={`translate(${cx} ${cy})`}>
        {dotField.map((d, i) => {
          const p = project(d.lat, d.lon, rot, R);
          if (!p.visible) return null;
          const a = 0.16 + Math.max(0, p.z) * 0.45;
          return <circle key={i} cx={p.x} cy={p.y} r={0.85} fill={`rgba(170,200,250,${a.toFixed(2)})`} />;
        })}
      </g>

      <g transform={`translate(${cx} ${cy})`} filter="url(#soft-glow)">
        {arcs.map((arc) => {
          const a = nodes[arc.a];
          const b = nodes[arc.b];
          const pa = project(a.lat, a.lon, rot, R);
          const pb = project(b.lat, b.lon, rot, R);
          if (!pa.visible || !pb.visible) return null;
          return (
            <path
              key={arc.id}
              d={arcPath(pa, pb, R, 1.3)}
              fill="none"
              stroke="url(#arc-grad)"
              strokeWidth="1.2"
              strokeLinecap="round"
              style={{
                strokeDasharray: 600,
                strokeDashoffset: 600,
                animation: "arc-draw 4s cubic-bezier(.2,.7,.2,1) forwards"
              }}
            />
          );
        })}
      </g>

      <g transform={`translate(${cx} ${cy})`}>
        {[
          { x: -180, y: -150, color: "var(--primary)" },
          { x: 200, y: -40, color: "var(--secondary)" },
          { x: -120, y: 170, color: "var(--tertiary)" }
        ].map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="10" fill={p.color} opacity="0.18">
              <animate attributeName="r" values="6;14;6" dur="3.6s" repeatCount="indefinite" begin={`${i * 0.6}s`} />
              <animate
                attributeName="opacity"
                values="0.25;0.05;0.25"
                dur="3.6s"
                repeatCount="indefinite"
                begin={`${i * 0.6}s`}
              />
            </circle>
            <circle cx={p.x} cy={p.y} r="2.4" fill={p.color} />
            <circle cx={p.x} cy={p.y} r="0.9" fill="#fff" />
          </g>
        ))}
      </g>

      <g transform={`translate(${cx} ${cy})`} opacity="0.6">
        <line x1="-180" y1="-150" x2="-260" y2="-220" stroke="rgba(var(--primary-rgb),0.5)" strokeWidth="0.8" strokeDasharray="3 4" />
        <line x1="200" y1="-40" x2="280" y2="-90" stroke="rgba(var(--secondary-rgb),0.5)" strokeWidth="0.8" strokeDasharray="3 4" />
        <line x1="-120" y1="170" x2="-220" y2="240" stroke="rgba(var(--tertiary-rgb),0.5)" strokeWidth="0.8" strokeDasharray="3 4" />
      </g>

      <style>{`
        @keyframes arc-draw {
          0% { stroke-dashoffset: 600; opacity: 0.2; }
          50% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
      `}</style>
    </svg>
  );
}
