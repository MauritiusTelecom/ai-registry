export {
  clearRegistry,
  getRestHandler,
  getUiSlotComponents,
  isPluginsEnabled,
  listPlugins,
  registerPlugin,
  registerRestRoute,
  registerUiSlot,
  type LoadedPlugin,
  type RestHandler
} from "./registry";

export { ensurePluginsLoaded, loadPlugins } from "./load.server";
export { handlePluginRest } from "./rest";
