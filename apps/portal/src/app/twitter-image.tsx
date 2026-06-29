// Twitter/X share card — same generated PNG as the Open Graph card.
// Route-segment config (runtime/alt/size/contentType) must be declared
// statically here; Next.js can't parse it when re-exported from another file.
export { default } from "./opengraph-image";

export const runtime = "nodejs";
export const alt = "Mauritius AI Registry";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
