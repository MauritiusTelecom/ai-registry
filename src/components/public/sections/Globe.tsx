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

// Global node pool — sovereign / edge / gov network nodes that cycle on the globe.
// Coordinates are radians (lat ~[-π/2..π/2], lon ~[-π..π]) approximating each
// country's capital. Indices 0..AFRICAN_END-1 are African (anchors first); the rest
// of the world follows. air.mu (index 0) and air.rw (index 1) are pinned anchors
// and never fade or get replaced. Random picks are biased toward African nodes.
const NODE_POOL: PoolNode[] = [
  // ===== Pinned anchors (must remain at indices 0 and 1) =====
  { lat: -0.352, lon: 1.004, label: "air.mu", kind: "sov" }, // Mauritius
  { lat: -0.034, lon: 0.525, label: "air.rw", kind: "gov" }, // Rwanda

  // ===== Africa =====
  // North Africa
  { lat: 0.641, lon: 0.053, label: "air.dz", kind: "sov" },   // Algeria
  { lat: 0.524, lon: 0.545, label: "air.eg", kind: "sov" },   // Egypt
  { lat: 0.574, lon: 0.230, label: "air.ly", kind: "edge" },  // Libya
  { lat: 0.594, lon: -0.119, label: "air.ma", kind: "sov" },  // Morocco
  { lat: 0.270, lon: 0.568, label: "air.sd", kind: "edge" },  // Sudan
  { lat: 0.642, lon: 0.178, label: "air.tn", kind: "sov" },   // Tunisia
  // West Africa
  { lat: 0.113, lon: 0.046, label: "air.bj", kind: "edge" },  // Benin
  { lat: 0.216, lon: -0.027, label: "air.bf", kind: "edge" }, // Burkina Faso
  { lat: 0.261, lon: -0.410, label: "air.cv", kind: "edge" }, // Cape Verde
  { lat: 0.119, lon: -0.092, label: "air.ci", kind: "sov" },  // Côte d'Ivoire
  { lat: 0.235, lon: -0.289, label: "air.gm", kind: "edge" }, // Gambia
  { lat: 0.098, lon: -0.003, label: "air.gh", kind: "sov" },  // Ghana
  { lat: 0.168, lon: -0.237, label: "air.gn", kind: "edge" }, // Guinea
  { lat: 0.207, lon: -0.272, label: "air.gw", kind: "edge" }, // Guinea-Bissau
  { lat: 0.110, lon: -0.188, label: "air.lr", kind: "edge" }, // Liberia
  { lat: 0.221, lon: -0.140, label: "air.ml", kind: "edge" }, // Mali
  { lat: 0.316, lon: -0.279, label: "air.mr", kind: "edge" }, // Mauritania
  { lat: 0.236, lon: 0.037, label: "air.ne", kind: "edge" },  // Niger
  { lat: 0.158, lon: 0.131, label: "air.ng", kind: "gov" },   // Nigeria
  { lat: 0.256, lon: -0.305, label: "air.sn", kind: "sov" },  // Senegal
  { lat: 0.148, lon: -0.231, label: "air.sl", kind: "edge" }, // Sierra Leone
  { lat: 0.107, lon: 0.021, label: "air.tg", kind: "edge" },  // Togo
  // Central Africa
  { lat: 0.067, lon: 0.201, label: "air.cm", kind: "sov" },   // Cameroon
  { lat: 0.076, lon: 0.324, label: "air.cf", kind: "edge" },  // Central African Republic
  { lat: 0.212, lon: 0.263, label: "air.td", kind: "edge" },  // Chad
  { lat: -0.074, lon: 0.266, label: "air.cg", kind: "edge" }, // Republic of the Congo
  { lat: -0.075, lon: 0.270, label: "air.cd", kind: "gov" },  // DR Congo
  { lat: 0.065, lon: 0.153, label: "air.gq", kind: "edge" },  // Equatorial Guinea
  { lat: 0.007, lon: 0.165, label: "air.ga", kind: "edge" },  // Gabon
  { lat: 0.006, lon: 0.117, label: "air.st", kind: "edge" },  // São Tomé & Príncipe
  // East Africa (Rwanda excluded — pinned at index 1)
  { lat: -0.060, lon: 0.522, label: "air.bi", kind: "edge" }, // Burundi
  { lat: -0.204, lon: 0.755, label: "air.km", kind: "edge" }, // Comoros
  { lat: 0.202, lon: 0.753, label: "air.dj", kind: "edge" },  // Djibouti
  { lat: 0.267, lon: 0.679, label: "air.er", kind: "edge" },  // Eritrea
  { lat: 0.158, lon: 0.676, label: "air.et", kind: "sov" },   // Ethiopia
  { lat: -0.023, lon: 0.643, label: "air.ke", kind: "sov" },  // Kenya
  { lat: -0.330, lon: 0.829, label: "air.mg", kind: "edge" }, // Madagascar
  { lat: -0.244, lon: 0.590, label: "air.mw", kind: "edge" }, // Malawi
  { lat: -0.453, lon: 0.569, label: "air.mz", kind: "edge" }, // Mozambique
  { lat: -0.081, lon: 0.968, label: "air.sc", kind: "edge" }, // Seychelles
  { lat: 0.036, lon: 0.791, label: "air.so", kind: "edge" },  // Somalia
  { lat: 0.085, lon: 0.551, label: "air.ss", kind: "edge" },  // South Sudan
  { lat: -0.107, lon: 0.624, label: "air.tz", kind: "sov" },  // Tanzania
  { lat: 0.005, lon: 0.569, label: "air.ug", kind: "sov" },   // Uganda
  { lat: -0.269, lon: 0.494, label: "air.zm", kind: "edge" }, // Zambia
  { lat: -0.311, lon: 0.542, label: "air.zw", kind: "edge" }, // Zimbabwe
  // Southern Africa
  { lat: -0.154, lon: 0.231, label: "air.ao", kind: "edge" }, // Angola
  { lat: -0.430, lon: 0.452, label: "air.bw", kind: "edge" }, // Botswana
  { lat: -0.459, lon: 0.543, label: "air.sz", kind: "edge" }, // Eswatini
  { lat: -0.512, lon: 0.480, label: "air.ls", kind: "edge" }, // Lesotho
  { lat: -0.394, lon: 0.298, label: "air.na", kind: "edge" }, // Namibia
  { lat: -0.449, lon: 0.492, label: "air.za", kind: "sov" },  // South Africa

  // ===== Rest of the world =====
  // North America
  { lat: 0.793, lon: -1.321, label: "air.ca", kind: "sov" },  // Canada
  { lat: 0.679, lon: -1.345, label: "air.us", kind: "sov" },  // United States
  { lat: 0.339, lon: -1.731, label: "air.mx", kind: "sov" },  // Mexico
  // Central America
  { lat: 0.301, lon: -1.549, label: "air.bz", kind: "edge" }, // Belize
  { lat: 0.173, lon: -1.468, label: "air.cr", kind: "edge" }, // Costa Rica
  { lat: 0.239, lon: -1.557, label: "air.sv", kind: "edge" }, // El Salvador
  { lat: 0.255, lon: -1.580, label: "air.gt", kind: "edge" }, // Guatemala
  { lat: 0.246, lon: -1.522, label: "air.hn", kind: "edge" }, // Honduras
  { lat: 0.212, lon: -1.506, label: "air.ni", kind: "edge" }, // Nicaragua
  { lat: 0.157, lon: -1.388, label: "air.pa", kind: "edge" }, // Panama
  // Caribbean
  { lat: 0.404, lon: -1.438, label: "air.cu", kind: "edge" }, // Cuba
  { lat: 0.327, lon: -1.225, label: "air.do", kind: "edge" }, // Dominican Republic
  { lat: 0.325, lon: -1.262, label: "air.ht", kind: "edge" }, // Haiti
  { lat: 0.314, lon: -1.341, label: "air.jm", kind: "edge" }, // Jamaica
  { lat: 0.437, lon: -1.350, label: "air.bs", kind: "edge" }, // Bahamas
  { lat: 0.229, lon: -1.039, label: "air.bb", kind: "edge" }, // Barbados
  { lat: 0.186, lon: -1.074, label: "air.tt", kind: "edge" }, // Trinidad & Tobago
  // South America
  { lat: -0.604, lon: -1.019, label: "air.ar", kind: "sov" },  // Argentina
  { lat: -0.288, lon: -1.189, label: "air.bo", kind: "edge" }, // Bolivia
  { lat: -0.276, lon: -0.836, label: "air.br", kind: "sov" },  // Brazil
  { lat: -0.584, lon: -1.234, label: "air.cl", kind: "sov" },  // Chile
  { lat: 0.082, lon: -1.293, label: "air.co", kind: "sov" },   // Colombia
  { lat: -0.003, lon: -1.370, label: "air.ec", kind: "edge" }, // Ecuador
  { lat: 0.119, lon: -1.015, label: "air.gy", kind: "edge" },  // Guyana
  { lat: -0.441, lon: -1.005, label: "air.py", kind: "edge" }, // Paraguay
  { lat: -0.210, lon: -1.345, label: "air.pe", kind: "sov" },  // Peru
  { lat: 0.102, lon: -0.964, label: "air.sr", kind: "edge" },  // Suriname
  { lat: -0.609, lon: -0.980, label: "air.uy", kind: "edge" }, // Uruguay
  { lat: 0.183, lon: -1.168, label: "air.ve", kind: "edge" },  // Venezuela
  // Europe
  { lat: 0.722, lon: 0.346, label: "air.al", kind: "edge" },   // Albania
  { lat: 0.842, lon: 0.286, label: "air.at", kind: "sov" },    // Austria
  { lat: 0.941, lon: 0.481, label: "air.by", kind: "edge" },   // Belarus
  { lat: 0.887, lon: 0.076, label: "air.be", kind: "sov" },    // Belgium
  { lat: 0.766, lon: 0.321, label: "air.ba", kind: "edge" },   // Bosnia & Herzegovina
  { lat: 0.745, lon: 0.407, label: "air.bg", kind: "sov" },    // Bulgaria
  { lat: 0.800, lon: 0.279, label: "air.hr", kind: "sov" },    // Croatia
  { lat: 0.614, lon: 0.583, label: "air.cy", kind: "sov" },    // Cyprus
  { lat: 0.874, lon: 0.252, label: "air.cz", kind: "sov" },    // Czech Republic
  { lat: 0.972, lon: 0.219, label: "air.dk", kind: "sov" },    // Denmark
  { lat: 1.038, lon: 0.432, label: "air.ee", kind: "sov" },    // Estonia
  { lat: 1.050, lon: 0.435, label: "air.fi", kind: "sov" },    // Finland
  { lat: 0.853, lon: 0.041, label: "air.fr", kind: "sov" },    // France
  { lat: 0.917, lon: 0.234, label: "air.de", kind: "sov" },    // Germany
  { lat: 0.663, lon: 0.414, label: "air.gr", kind: "sov" },    // Greece
  { lat: 0.829, lon: 0.332, label: "air.hu", kind: "sov" },    // Hungary
  { lat: 1.119, lon: -0.381, label: "air.is", kind: "edge" },  // Iceland
  { lat: 0.931, lon: -0.109, label: "air.ie", kind: "sov" },   // Ireland
  { lat: 0.731, lon: 0.218, label: "air.it", kind: "sov" },    // Italy
  { lat: 0.745, lon: 0.369, label: "air.xk", kind: "edge" },   // Kosovo
  { lat: 0.994, lon: 0.421, label: "air.lv", kind: "sov" },    // Latvia
  { lat: 0.954, lon: 0.441, label: "air.lt", kind: "sov" },    // Lithuania
  { lat: 0.866, lon: 0.107, label: "air.lu", kind: "sov" },    // Luxembourg
  { lat: 0.627, lon: 0.253, label: "air.mt", kind: "edge" },   // Malta
  { lat: 0.820, lon: 0.504, label: "air.md", kind: "edge" },   // Moldova
  { lat: 0.741, lon: 0.336, label: "air.me", kind: "edge" },   // Montenegro
  { lat: 0.914, lon: 0.085, label: "air.nl", kind: "sov" },    // Netherlands
  { lat: 0.733, lon: 0.374, label: "air.mk", kind: "edge" },   // North Macedonia
  { lat: 1.046, lon: 0.188, label: "air.no", kind: "sov" },    // Norway
  { lat: 0.911, lon: 0.367, label: "air.pl", kind: "sov" },    // Poland
  { lat: 0.676, lon: -0.159, label: "air.pt", kind: "sov" },   // Portugal
  { lat: 0.776, lon: 0.456, label: "air.ro", kind: "sov" },    // Romania
  { lat: 0.973, lon: 0.657, label: "air.ru", kind: "gov" },    // Russia
  { lat: 0.782, lon: 0.357, label: "air.rs", kind: "edge" },   // Serbia
  { lat: 0.840, lon: 0.299, label: "air.sk", kind: "sov" },    // Slovakia
  { lat: 0.804, lon: 0.253, label: "air.si", kind: "sov" },    // Slovenia
  { lat: 0.706, lon: -0.065, label: "air.es", kind: "sov" },   // Spain
  { lat: 1.036, lon: 0.315, label: "air.se", kind: "sov" },    // Sweden
  { lat: 0.819, lon: 0.130, label: "air.ch", kind: "sov" },    // Switzerland
  { lat: 0.881, lon: 0.533, label: "air.ua", kind: "edge" },   // Ukraine
  { lat: 0.899, lon: -0.002, label: "air.uk", kind: "sov" },   // United Kingdom
  // Asia
  { lat: 0.602, lon: 1.207, label: "air.af", kind: "edge" },   // Afghanistan
  { lat: 0.702, lon: 0.777, label: "air.am", kind: "edge" },   // Armenia
  { lat: 0.706, lon: 0.871, label: "air.az", kind: "edge" },   // Azerbaijan
  { lat: 0.458, lon: 0.883, label: "air.bh", kind: "edge" },   // Bahrain
  { lat: 0.415, lon: 1.578, label: "air.bd", kind: "edge" },   // Bangladesh
  { lat: 0.480, lon: 1.564, label: "air.bt", kind: "edge" },   // Bhutan
  { lat: 0.079, lon: 2.003, label: "air.bn", kind: "edge" },   // Brunei
  { lat: 0.202, lon: 1.832, label: "air.kh", kind: "edge" },   // Cambodia
  { lat: 0.696, lon: 2.032, label: "air.cn", kind: "gov" },    // China
  { lat: 0.728, lon: 0.782, label: "air.ge", kind: "edge" },   // Georgia
  { lat: 0.499, lon: 1.348, label: "air.in", kind: "sov" },    // India
  { lat: -0.108, lon: 1.865, label: "air.id", kind: "sov" },   // Indonesia
  { lat: 0.623, lon: 0.897, label: "air.ir", kind: "gov" },    // Iran
  { lat: 0.581, lon: 0.774, label: "air.iq", kind: "edge" },   // Iraq
  { lat: 0.555, lon: 0.615, label: "air.il", kind: "sov" },    // Israel
  { lat: 0.623, lon: 2.439, label: "air.jp", kind: "sov" },    // Japan
  { lat: 0.557, lon: 0.627, label: "air.jo", kind: "edge" },   // Jordan
  { lat: 0.893, lon: 1.247, label: "air.kz", kind: "edge" },   // Kazakhstan
  { lat: 0.513, lon: 0.838, label: "air.kw", kind: "edge" },   // Kuwait
  { lat: 0.748, lon: 1.302, label: "air.kg", kind: "edge" },   // Kyrgyzstan
  { lat: 0.314, lon: 1.791, label: "air.la", kind: "edge" },   // Laos
  { lat: 0.591, lon: 0.620, label: "air.lb", kind: "edge" },   // Lebanon
  { lat: 0.055, lon: 1.775, label: "air.my", kind: "sov" },    // Malaysia
  { lat: 0.073, lon: 1.283, label: "air.mv", kind: "edge" },   // Maldives
  { lat: 0.836, lon: 1.866, label: "air.mn", kind: "edge" },   // Mongolia
  { lat: 0.345, lon: 1.677, label: "air.mm", kind: "edge" },   // Myanmar
  { lat: 0.484, lon: 1.490, label: "air.np", kind: "edge" },   // Nepal
  { lat: 0.681, lon: 2.195, label: "air.kp", kind: "gov" },    // North Korea
  { lat: 0.412, lon: 1.020, label: "air.om", kind: "edge" },   // Oman
  { lat: 0.588, lon: 1.275, label: "air.pk", kind: "edge" },   // Pakistan
  { lat: 0.255, lon: 2.112, label: "air.ph", kind: "sov" },    // Philippines
  { lat: 0.441, lon: 0.900, label: "air.qa", kind: "edge" },   // Qatar
  { lat: 0.431, lon: 0.815, label: "air.sa", kind: "sov" },    // Saudi Arabia
  { lat: 0.024, lon: 1.812, label: "air.sg", kind: "sov" },    // Singapore
  { lat: 0.656, lon: 2.216, label: "air.kr", kind: "sov" },    // South Korea
  { lat: 0.121, lon: 1.394, label: "air.lk", kind: "edge" },   // Sri Lanka
  { lat: 0.585, lon: 0.633, label: "air.sy", kind: "edge" },   // Syria
  { lat: 0.437, lon: 2.122, label: "air.tw", kind: "sov" },    // Taiwan
  { lat: 0.678, lon: 1.244, label: "air.tj", kind: "edge" },   // Tajikistan
  { lat: 0.240, lon: 1.754, label: "air.th", kind: "sov" },    // Thailand
  { lat: -0.149, lon: 2.192, label: "air.tl", kind: "edge" },  // Timor-Leste
  { lat: 0.697, lon: 0.574, label: "air.tr", kind: "sov" },    // Turkey
  { lat: 0.662, lon: 1.019, label: "air.tm", kind: "edge" },   // Turkmenistan
  { lat: 0.427, lon: 0.949, label: "air.ae", kind: "gov" },    // UAE
  { lat: 0.721, lon: 1.209, label: "air.uz", kind: "edge" },   // Uzbekistan
  { lat: 0.367, lon: 1.847, label: "air.vn", kind: "sov" },    // Vietnam
  { lat: 0.268, lon: 0.771, label: "air.ye", kind: "edge" },   // Yemen
  // Oceania
  { lat: -0.616, lon: 2.603, label: "air.au", kind: "sov" },   // Australia
  { lat: -0.316, lon: 3.114, label: "air.fj", kind: "edge" },  // Fiji
  { lat: -0.721, lon: 3.050, label: "air.nz", kind: "sov" },   // New Zealand
  { lat: -0.165, lon: 2.569, label: "air.pg", kind: "edge" },  // Papua New Guinea
  { lat: -0.165, lon: 2.792, label: "air.sb", kind: "edge" },  // Solomon Islands
  { lat: -0.241, lon: -2.998, label: "air.ws", kind: "edge" }, // Samoa
  { lat: -0.369, lon: -3.058, label: "air.to", kind: "edge" }, // Tonga
  { lat: -0.310, lon: 2.938, label: "air.vu", kind: "edge" }   // Vanuatu
];

const MU_INDEX = 0; // air.mu — permanent home anchor
const RW_INDEX = 1; // air.rw — permanent secondary anchor
const AFRICAN_END = 54; // indices 0..53 are African; pickIdx biases toward this range
const PINNED = new Set<number>([MU_INDEX, RW_INDEX]);
const AFRICAN_BIAS = 0.6; // probability that a random pick comes from the African range

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

/** Fixed pool indices — deterministic so SSR matches first client hydrate (no
 *  random/performance in useState init). Both pinned slots (MU, RW) take indices 0
 *  and 1; the remaining (ACTIVE_COUNT - 2 = 5) slots are seeded from this list,
 *  spanning North/West/Central/East/Southern Africa for a balanced opening view. */
const INITIAL_SLOT_INDICES = [3, 13, 25, 37, 53] as const; // EG, GH, CF, KE, ZA

/** Minimum projected z-depth for a node to be considered "well visible" — i.e.
 *  comfortably on the front hemisphere with rotation buffer before it hides.
 *  At rotation speed ~0.31 rad/s, z=0.35 gives ~3s of visibility before the
 *  z=-0.05 hide threshold, which covers most of a slot's fade-in + hold. */
const VISIBLE_Z_MIN = 0.35;

/** Pick a random pool index with bias toward African nodes, excluding any index
 *  in `used` and any pinned anchor. When a `currentRot` is supplied, only nodes
 *  whose projected z exceeds `VISIBLE_Z_MIN` are considered; if no visible
 *  candidates remain, we relax the visibility filter and pick from the broader
 *  range so the picker never returns -1 just because the front hemisphere is
 *  briefly empty in one bias range. */
function pickRandomIdx(used: Set<number>, currentRot?: number): number {
  const pickAfrican = Math.random() < AFRICAN_BIAS;
  const ranges: Array<[number, number]> = pickAfrican
    ? [[0, AFRICAN_END], [AFRICAN_END, NODE_POOL.length]]
    : [[AFRICAN_END, NODE_POOL.length], [0, AFRICAN_END]];

  const collect = (requireVisible: boolean) => {
    for (const [start, end] of ranges) {
      const candidates: number[] = [];
      for (let i = start; i < end; i++) {
        if (used.has(i) || PINNED.has(i)) continue;
        if (requireVisible && currentRot !== undefined) {
          const node = NODE_POOL[i];
          const z = Math.cos(node.lat) * Math.cos(node.lon + currentRot);
          if (z < VISIBLE_Z_MIN) continue;
        }
        candidates.push(i);
      }
      if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
    }
    return -1;
  };

  // Prefer well-visible nodes; relax to any-unused if none are currently visible.
  const visible = collect(true);
  if (visible >= 0) return visible;
  return collect(false);
}

function deterministicInitialSlots(): Slot[] {
  const initial: Slot[] = [];
  // Slot 0: air.mu (permanent), Slot 1: air.rw (permanent).
  initial.push({
    key: 0,
    nodeIdx: MU_INDEX,
    bornAt: 0,
    lifetime: Number.POSITIVE_INFINITY,
    delayMs: 0
  });
  initial.push({
    key: 1,
    nodeIdx: RW_INDEX,
    bornAt: 0,
    lifetime: Number.POSITIVE_INFINITY,
    delayMs: 0
  });
  const n = ACTIVE_COUNT - 2;
  for (let i = 0; i < n; i++) {
    const lifetime = Math.round(LIFETIME_MIN + ((i + 1) / n) * (LIFETIME_RANGE - 1));
    const phase = Math.round(((i + 1) / ACTIVE_COUNT) * lifetime);
    initial.push({
      key: i + 2,
      nodeIdx: INITIAL_SLOT_INDICES[i],
      bornAt: -phase,
      lifetime,
      delayMs: -phase
    });
  }
  return initial;
}

function randomSlotsFromNow(now: number, startKey: number, currentRot: number): Slot[] {
  const initial: Slot[] = [];
  let key = startKey;
  const used = new Set<number>([MU_INDEX, RW_INDEX]);

  initial.push({
    key: key++,
    nodeIdx: MU_INDEX,
    bornAt: now,
    lifetime: Number.POSITIVE_INFINITY,
    delayMs: 0
  });
  initial.push({
    key: key++,
    nodeIdx: RW_INDEX,
    bornAt: now,
    lifetime: Number.POSITIVE_INFINITY,
    delayMs: 0
  });

  for (let i = 2; i < ACTIVE_COUNT; i++) {
    const idx = pickRandomIdx(used, currentRot);
    if (idx < 0) break;
    used.add(idx);
    const lifetime = Math.round(LIFETIME_MIN + Math.random() * LIFETIME_RANGE);
    const phase = Math.round((i / ACTIVE_COUNT) * lifetime);
    initial.push({
      key: key++,
      nodeIdx: idx,
      bornAt: now - phase,
      lifetime,
      delayMs: -phase
    });
  }

  return initial;
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

  // ---- Active fading network slots -------------------------------------------------
  // 7 slots are active at any moment. Each slot picks a node from NODE_POOL, fades in,
  // holds, fades out, and is replaced with a fresh random node — independent of all
  // other slots, so the globe surface always shows ~7 named nodes that turn over.
  const slotKeyRef = useRef(ACTIVE_COUNT);
  const [slots, setSlots] = useState<Slot[]>(deterministicInitialSlots);

  // Track current rotation in a ref so non-rerendering callbacks (the replacement
  // tick interval and post-mount seed) can read up-to-date rot without retriggering.
  const rotRef = useRef(rot);
  useEffect(() => {
    rotRef.current = rot;
  }, [rot]);

  // Swap to seeded-random slots only after mount so SSR markup matches hydrate.
  useEffect(() => {
    const now = performance.now();
    setSlots(randomSlotsFromNow(now, slotKeyRef.current, rotRef.current));
    slotKeyRef.current += ACTIVE_COUNT;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The replacement tick reads rotRef (declared above) so it can swap slots whose
  // nodes have rotated to the back of the globe and pick fresh nodes from the
  // front hemisphere.
  useEffect(() => {
    const handle = window.setInterval(() => {
      const now = performance.now();
      const currentRot = rotRef.current;
      setSlots((prev) => {
        const used = new Set(prev.map((s) => s.nodeIdx));
        let changed = false;
        const next = prev.map((s) => {
          // air.mu and air.rw are permanent anchors — skip expiry.
          if (PINNED.has(s.nodeIdx)) return s;
          // Compute current visibility of this slot's node.
          const node = NODE_POOL[s.nodeIdx];
          const z = Math.cos(node.lat) * Math.cos(node.lon + currentRot);
          const rotatedOut = z < -0.05;
          // Replace when lifetime expired OR when the node has rotated out of
          // sight (the user can't see it anyway, so swap it for a visible one).
          if (now - s.bornAt < s.lifetime && !rotatedOut) return s;
          used.delete(s.nodeIdx);
          const idx = pickRandomIdx(used, currentRot);
          if (idx < 0) return s; // pool exhausted — keep the existing slot
          used.add(idx);
          changed = true;
          return {
            key: slotKeyRef.current++,
            nodeIdx: idx,
            bornAt: now,
            lifetime: Math.round(LIFETIME_MIN + Math.random() * LIFETIME_RANGE),
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
        {/* Rwanda flag — sky blue / yellow / green, used as a glow border around air.rw */}
        <linearGradient id="rwanda-flag-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00A1DE" />
          <stop offset="50%" stopColor="#00A1DE" />
          <stop offset="50%" stopColor="#FAD201" />
          <stop offset="75%" stopColor="#FAD201" />
          <stop offset="75%" stopColor="#20603D" />
          <stop offset="100%" stopColor="#20603D" />
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
          on its own independent timeline. air.mu (cyan) and air.rw (amber) are the
          permanent anchor nodes — they never fade and are rendered with a glowing
          colored halo to mark them as pinned. */}
      <g transform={`translate(${cx} ${cy})`}>
        {slots.map((slot) => {
          const node = NODE_POOL[slot.nodeIdx];
          const p = project(node.lat, node.lon, rot, R);
          const isPinned = PINNED.has(slot.nodeIdx);
          const isHome = slot.nodeIdx === MU_INDEX;
          const isRwanda = slot.nodeIdx === RW_INDEX;
          // Anchor accents — cyan for the home node, Rwanda flag yellow for air.rw
          // (the Rwanda halo border itself uses the full flag gradient).
          const accent = isHome ? "34,211,238" : "250,210,1"; // rgb triplets
          const accentSolid = `rgb(${accent})`;
          const haloFill = isRwanda
            ? "rgba(250,210,1,0.06)"
            : `rgba(${accent},0.08)`;
          const haloStroke = isRwanda ? "url(#rwanda-flag-grad)" : accentSolid;
          const outerStroke = isRwanda
            ? "url(#rwanda-flag-grad)"
            : `rgba(${accent},0.35)`;
          const color = isPinned
            ? accentSolid
            : node.kind === "gov"
            ? "var(--tertiary)"
            : node.kind === "sov"
            ? "var(--primary)"
            : "var(--secondary)";
          return (
            <g
              key={slot.key}
              style={{
                ...(isPinned
                  ? {}
                  : {
                      animationName: "node-fade",
                      animationDuration: `${slot.lifetime}ms`,
                      animationTimingFunction: "ease-in-out",
                      animationIterationCount: 1,
                      animationFillMode: "forwards",
                      animationDelay: `${slot.delayMs}ms`
                    }),
                visibility: p.visible ? "visible" : "hidden"
              }}
            >
              {isPinned && (
                <>
                  {/* Outer pulsing accent glow — flag gradient for Rwanda, accent
                      rgba for Mauritius. */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="18"
                    fill="none"
                    stroke={outerStroke}
                    strokeWidth={isRwanda ? "1.2" : "1"}
                    filter="url(#soft-glow)"
                  >
                    <animate
                      attributeName="r"
                      values="14;22;14"
                      dur="3s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values={isRwanda ? "0.45;0.95;0.45" : "0.35;0.85;0.35"}
                      dur="3s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  {/* Solid halo ring — Rwanda uses the flag gradient as a glow
                      border (sky blue / yellow / green stripes). */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="11"
                    fill={haloFill}
                    stroke={haloStroke}
                    strokeWidth={isRwanda ? "1.6" : "1.4"}
                    filter="url(#soft-glow)"
                  />
                </>
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r="10"
                fill={color}
                opacity={isPinned ? "0.28" : "0.18"}
              >
                <animate
                  attributeName="r"
                  values={isPinned ? "7;12;7" : "6;14;6"}
                  dur="2.8s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx={p.x} cy={p.y} r={isPinned ? "3" : "2.4"} fill={color} />
              <circle cx={p.x} cy={p.y} r={isPinned ? "1.2" : "0.9"} fill="#fff" />
              <text
                x={p.x + (isPinned ? 14 : 9)}
                y={p.y - (isPinned ? 9 : 7)}
                fontSize={isPinned ? 11 : 9.5}
                fontFamily="'IBM Plex Mono', monospace"
                letterSpacing="0.06em"
                fill={isPinned ? `rgba(${accent},0.95)` : "rgba(220,235,255,0.78)"}
                fontWeight={isPinned ? 600 : 400}
                opacity={isPinned ? 1 : p.z > 0.35 ? 1 : 0}
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
