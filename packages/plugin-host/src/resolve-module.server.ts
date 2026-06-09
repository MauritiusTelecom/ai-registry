import "server-only";
import type { ComponentType } from "react";
import type { RestHandler } from "./registry";

type RestModule = {
  GET?: RestHandler;
  POST?: RestHandler;
  PUT?: RestHandler;
  PATCH?: RestHandler;
  DELETE?: RestHandler;
  default?: RestHandler;
};

/**
 * Static, bundler-friendly module resolution for shipped reference extensions.
 * Third-party plugins add a case here (or a future generated map) until dynamic
 * manifest resolution is supported.
 */
export async function importRestHandler(specifier: string): Promise<RestModule> {
  switch (specifier) {
    case "@airegistry/extension-hello/rest/ping":
      return import("@airegistry/extension-hello/rest/ping");
    case "@airegistry/extension-mauritius-bom-banking-license/rest/validate":
      return import("@airegistry/extension-mauritius-bom-banking-license/rest/validate");
    case "@airegistry/extension-mauritius-brn-check/rest/validate":
      return import("@airegistry/extension-mauritius-brn-check/rest/validate");
    default:
      throw new Error(`Unknown plugin REST handler: ${specifier}`);
  }
}

export async function importUiComponent(specifier: string): Promise<ComponentType> {
  switch (specifier) {
    case "@airegistry/extension-hello/ui/HeroBelow": {
      const mod = await import("@airegistry/extension-hello/ui/HeroBelow");
      const component =
        mod.default ??
        Object.values(mod).find((v) => typeof v === "function") ??
        null;
      if (!component) {
        throw new Error(`No component export in ${specifier}`);
      }
      return component as ComponentType;
    }
    default:
      throw new Error(`Unknown plugin UI component: ${specifier}`);
  }
}
