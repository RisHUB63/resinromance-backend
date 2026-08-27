import { NextResponse } from "next/server";
import { verifyAuthToken, type AuthTokenPayload } from "@/lib/jwt";

export function getAuthPayload(request: Request): AuthTokenPayload | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}

export function unauthorized(message = "Authentication required") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Admin access required") {
  return NextResponse.json({ error: message }, { status: 403 });
}
