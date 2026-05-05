import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/src/auth/session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.PORT_MANAGER_COOKIE_SECURE === "true",
    path: "/",
    maxAge: 0
  });
  return response;
}
