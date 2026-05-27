import type { ComponentType } from "react";
import type { PluginManifest } from "@airegistry/sdk/plugin";

export type RestHandler = (request: Request) => Promise<Response>;

export type LoadedPlugin = {
  manifest: PluginManifest;
  packageName: string;
};

type RestRouteKey = string;

const plugins: LoadedPlugin[] = [];
const restHandlers = new Map<RestRouteKey, RestHandler>();
const uiSlots = new Map<string, ComponentType[]>();

function restKey(pluginId: string, method: string, routePath: string): RestRouteKey {
  return `${pluginId}:${method.toUpperCase()}:${routePath}`;
}

export function clearRegistry(): void {
  plugins.length = 0;
  restHandlers.clear();
  uiSlots.clear();
}

export function registerPlugin(entry: LoadedPlugin): void {
  plugins.push(entry);
}

export function listPlugins(): readonly LoadedPlugin[] {
  return plugins;
}

export function registerRestRoute(
  pluginId: string,
  method: string,
  routePath: string,
  handler: RestHandler
): void {
  const normalized = routePath.startsWith("/") ? routePath : `/${routePath}`;
  restHandlers.set(restKey(pluginId, method, normalized), handler);
}

export function registerUiSlot(slotId: string, component: ComponentType): void {
  const list = uiSlots.get(slotId) ?? [];
  list.push(component);
  uiSlots.set(slotId, list);
}

export function getRestHandler(
  pluginId: string,
  method: string,
  routePath: string
): RestHandler | undefined {
  const normalized = routePath.startsWith("/") ? routePath : `/${routePath}`;
  return restHandlers.get(restKey(pluginId, method, normalized));
}

export function getUiSlotComponents(slotId: string): ComponentType[] {
  return uiSlots.get(slotId) ?? [];
}

export function isPluginsEnabled(): boolean {
  const flag = process.env.PLUGINS_ENABLED;
  if (flag === undefined || flag === "") {
    return process.env.NODE_ENV !== "production";
  }
  return flag !== "0" && flag.toLowerCase() !== "false";
}
