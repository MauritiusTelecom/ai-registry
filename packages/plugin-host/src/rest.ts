import { NextResponse } from "next/server";
import { getRestHandler, isPluginsEnabled } from "./registry";
import { ensurePluginsLoaded as load } from "./load.server";

export async function handlePluginRest(
  pluginId: string,
  method: string,
  pathSegments: string[] | undefined,
  request: Request
): Promise<Response> {
  if (!isPluginsEnabled()) {
    return NextResponse.json({ error: "Plugins are disabled" }, { status: 404 });
  }

  await load();

  const subPath = pathSegments?.length ? `/${pathSegments.join("/")}` : "/";
  const handler = getRestHandler(pluginId, method, subPath);

  if (!handler) {
    return NextResponse.json(
      { error: "Not found", pluginId, path: subPath, method },
      { status: 404 }
    );
  }

  return handler(request);
}
