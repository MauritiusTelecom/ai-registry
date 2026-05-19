import { NextResponse } from "next/server";
import { REGISTRATION_MSG } from "./authoring-messages";

/** 403 JSON when `canAuthorResources` is false (portal resource create/submit). */
export function authoringGateForbiddenResponse(): NextResponse {
  return NextResponse.json(
    {
      error: REGISTRATION_MSG,
      code: "registration_incomplete"
    },
    { status: 403 }
  );
}
