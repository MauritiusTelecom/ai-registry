/**
 * Top-level barrel for the shared primitive layer.
 *
 *   import { PageSection, FeatureCard, CardGrid, Button } from "@/components/library";
 *
 * If you prefer the more expressive form, import from a sub-folder instead:
 *
 *   import { FeatureCard } from "@/components/library/content";
 *
 * See `README.md` in this folder for the three rules that keep this layer
 * honest (no domain types, no business strings, CSS from `globals.css`).
 */

export * from "./chrome";
export * from "./layout";
export * from "./content";
export * from "./controls";
export * from "./forms";
export * from "./feedback";
export * from "./data";
export * from "./nav";
export * from "./motion";
export * from "./theme";
