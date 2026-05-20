import type { ComponentType, ReactNode } from "react";
import { getUiSlotComponents, isPluginsEnabled } from "./registry";

export type PluginSlotProps = {
  /** Registered slot id, e.g. `public.home.hero.below`. */
  id: string;
};

function SlotErrorBoundary({
  children,
  slotId
}: {
  children: ReactNode;
  slotId: string;
}) {
  return <div data-plugin-slot={slotId}>{children}</div>;
}

/**
 * Renders all UI contributions registered for a slot id.
 * Failures in one widget should not break the page (wrap in a simple container).
 */
/**
 * Renders UI contributions registered for a slot id. Plugins must be loaded
 * first on the server (e.g. `ensurePluginsLoaded()` in the root layout).
 */
export async function PluginSlot({ id }: PluginSlotProps) {
  if (!isPluginsEnabled()) return null;

  const components = getUiSlotComponents(id);
  if (!components.length) return null;

  return (
    <SlotErrorBoundary slotId={id}>
      {components.map((Component, index) => (
        <PluginSlotItem key={`${id}-${index}`} Component={Component} />
      ))}
    </SlotErrorBoundary>
  );
}

function PluginSlotItem({ Component }: { Component: ComponentType }) {
  return <Component />;
}
