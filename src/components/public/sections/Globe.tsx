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

type PoolNode = {
  lat: number;
  lon: number;
  label: string;
  kind: "sov" | "edge" | "gov";
};

// Pool of sovereign / edge / gov network nodes that cycle on the globe.
// Coordinates are radians (lat ~[-π/2..π/2], lon ~[-π..π]) approximating each region.
const NODE_POOL: PoolNode[] = [
  { lat: -0.35, lon: 1.0, label: "air.mu", kind: "sov" },
  { lat: 0.66, lon: -1.71, label: "air.us", kind: "sov" },
  { lat: 0.87, lon: 0.17, label: "air.eu", kind: "sov" },
  { lat: 0.35, lon: 1.36, label: "air.in", kind: "edge" },
  { lat: 0.91, lon: 0.0, label: "air.uk", kind: "sov" },
  { lat: -0.44, lon: 2.34, label: "air.au", kind: "edge" },
  { lat: 0.63, lon: 2.43, label: "air.jp", kind: "sov" },
  { lat: -0.17, lon: -0.96, label: "air.br", kind: "edge" },
  { lat: 0.17, lon: 0.14, label: "air.ng", kind: "gov" },
  { lat: 0.42, lon: 0.94, label: "air.ae", kind: "gov" },
  { lat: 0.0, lon: 0.66, label: "air.ke", kind: "edge" },
  { lat: 0.98, lon: -1.85, label: "air.ca", kind: "sov" },
  { lat: -0.51, lon: 0.42, label: "air.za", kind: "edge" },
  { lat: 0.84, lon: 0.18, label: "air.de", kind: "sov" },
  { lat: 0.84, lon: 0.04, label: "air.fr", kind: "sov" },
  { lat: 0.45, lon: 0.62, label: "air.tr", kind: "edge" },
  { lat: 0.02, lon: 1.81, label: "air.sg", kind: "edge" },
  { lat: 0.62, lon: 1.97, label: "air.cn", kind: "gov" }
];

const ACTIVE_COUNT = 7;
const LIFETIME_MIN = 4500;
const LIFETIME_RANGE = 3500;

type Slot = {
  key: number;
  nodeIdx: number;
  bornAt: number;
  lifetime: number;
  delayMs: number;
};

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

  // ---- Active fading network slots -------------------------------------------------
  // 7 slots are active at any moment. Each slot picks a node from NODE_POOL, fades in,
  // holds, fades out, and is replaced with a fresh random node — independent of all
  // other slots, so the globe surface always shows ~7 named nodes that turn over.
  const slotKeyRef = useRef(0);
  const [slots, setSlots] = useState<Slot[]>(() => {
    const initial: Slot[] = [];
    const used = new Set<number>();
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    for (let i = 0; i < ACTIVE_COUNT; i++) {
      let idx: number;
      do {
        idx = Math.floor(Math.random() * NODE_POOL.length);
      } while (used.has(idx));
      used.add(idx);
      const lifetime = LIFETIME_MIN + Math.random() * LIFETIME_RANGE;
      // Stagger initial slots across their lifetime cycle so they don't fade together.
      const phase = (i / ACTIVE_COUNT) * lifetime;
      initial.push({
        key: slotKeyRef.current++,
        nodeIdx: idx,
        bornAt: now - phase,
        lifetime,
        delayMs: -phase
      });
    }
    return initial;
  });

  useEffect(() => {
    const handle = window.setInterval(() => {
      const now = performance.now();
      setSlots((prev) => {
        const used = new Set(prev.map((s) => s.nodeIdx));
        let changed = false;
        const next = prev.map((s) => {
          if (now - s.bornAt < s.lifetime) return s;
          used.delete(s.nodeIdx);
          let idx: number;
          do {
            idx = Math.floor(Math.random() * NODE_POOL.length);
          } while (used.has(idx));
          used.add(idx);
          changed = true;
          return {
            key: slotKeyRef.current++,
            nodeIdx: idx,
            bornAt: now,
            lifetime: LIFETIME_MIN + Math.random() * LIFETIME_RANGE,
            delayMs: 0
          };
        });
        return changed ? next : prev;
      });
    }, 200);
    return () => window.clearInterval(handle);
  }, []);

  // Arcs connect random pairs from the pool.
  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  const [arcs, setArcs] = useState<{ a: number; b: number; id: string }[]>([]);
  useEffect(() => {
    const interval = Math.max(2400, 5000 - motionIntensity * 25);
    const tick = () => {
      const cur = slotsRef.current;
      if (cur.length < 2) return;
      const ai = Math.floor(Math.random() * cur.length);
      let bi = Math.floor(Math.random() * cur.length);
      if (bi === ai) bi = (bi + 1) % cur.length;
      const id = Math.random().toString(36).slice(2);
      setArcs((prev) => [...prev.slice(-3), { a: cur[ai].nodeIdx, b: cur[bi].nodeIdx, id }]);
    };
    const handle = window.setInterval(tick, interval);
    tick();
    return () => window.clearInterval(handle);
  }, [motionIntensity]);

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
          const a = NODE_POOL[arc.a];
          const b = NODE_POOL[arc.b];
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

      {/* Active fading network nodes — 7 named slots, each fades in/holds/fades out
          on its own independent timeline. */}
      <g transform={`translate(${cx} ${cy})`}>
        {slots.map((slot) => {
          const node = NODE_POOL[slot.nodeIdx];
          const p = project(node.lat, node.lon, rot, R);
          const color =
            node.kind === "gov"
              ? "var(--tertiary)"
              : node.kind === "sov"
              ? "var(--primary)"
              : "var(--secondary)";
          return (
            <g
              key={slot.key}
              style={{
                animation: `node-fade ${slot.lifetime}ms ease-in-out forwards`,
                animationDelay: `${slot.delayMs}ms`,
                visibility: p.visible ? "visible" : "hidden"
              }}
            >
              <circle cx={p.x} cy={p.y} r="10" fill={color} opacity="0.18">
                <animate
                  attributeName="r"
                  values="6;14;6"
                  dur="2.8s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx={p.x} cy={p.y} r="2.4" fill={color} />
              <circle cx={p.x} cy={p.y} r="0.9" fill="#fff" />
              <text
                x={p.x + 9}
                y={p.y - 7}
                fontSize="9.5"
                fontFamily="'IBM Plex Mono', monospace"
                letterSpacing="0.06em"
                fill="rgba(220,235,255,0.78)"
                opacity={p.z > 0.35 ? 1 : 0}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </g>

      <style>{`
        @keyframes arc-draw {
          0% { stroke-dashoffset: 600; opacity: 0.2; }
          50% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes node-fade {
          0%, 100% { opacity: 0; }
          18%, 82% { opacity: 1; }
        }
      `}</style>
    </svg>
  );
}
