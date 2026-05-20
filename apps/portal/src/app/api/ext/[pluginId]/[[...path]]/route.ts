import { handlePluginRest } from "@airegistry/plugin-host";

type RouteContext = {
  params: Promise<{ pluginId: string; path?: string[] }>;
};

async function dispatch(
  request: Request,
  context: RouteContext,
  method: string
): Promise<Response> {
  const { pluginId, path } = await context.params;
  return handlePluginRest(pluginId, method, path, request);
}

export function GET(request: Request, context: RouteContext) {
  return dispatch(request, context, "GET");
}

export function POST(request: Request, context: RouteContext) {
  return dispatch(request, context, "POST");
}

export function PUT(request: Request, context: RouteContext) {
  return dispatch(request, context, "PUT");
}

export function PATCH(request: Request, context: RouteContext) {
  return dispatch(request, context, "PATCH");
}

export function DELETE(request: Request, context: RouteContext) {
  return dispatch(request, context, "DELETE");
}
