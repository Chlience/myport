import { NextResponse } from "next/server";
import { errorResponse } from "@/src/api/responses";
import { createSessionToken, SESSION_COOKIE_NAME, sessionCookieOptions, validateCredentials } from "@/src/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    if (!validateCredentials(String(body.username ?? ""), String(body.password ?? ""))) {
      return NextResponse.json(
        { error: { code: "invalid_credentials", message: "Invalid username or password." } },
        { status: 401 }
      );
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(), sessionCookieOptions());
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
