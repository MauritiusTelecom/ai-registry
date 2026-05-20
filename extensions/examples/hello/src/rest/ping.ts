import { NextResponse } from "next/server";

/**
 * GET /api/ext/hello/ping — reference extension REST handler.
 */
export async function GET() {
  return NextResponse.json({
    plugin: "hello",
    message: "Hello from the AI Registry example extension.",
    ok: true
  });
}
