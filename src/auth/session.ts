import { createHmac, timingSafeEqual } from "node:crypto";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { getAuthConfig } from "./env";

export const SESSION_COOKIE_NAME = "port_manager_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  sub: "single-user";
  iat: number;
  exp: number;
};

export function validateCredentials(username: string, password: string): boolean {
  const config = getAuthConfig();
  return constantTimeEqual(username, config.username) && constantTimeEqual(password, config.password);
}

export function createSessionToken(nowSeconds = Math.floor(Date.now() / 1000)): string {
  const payload: SessionPayload = {
    sub: "single-user",
    iat: nowSeconds,
    exp: nowSeconds + SESSION_MAX_AGE_SECONDS
  };
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | undefined, nowSeconds = Math.floor(Date.now() / 1000)): SessionPayload | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;
  if (!constantTimeEqual(signature, sign(encodedPayload))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    if (payload.sub !== "single-user" || typeof payload.exp !== "number" || payload.exp < nowSeconds) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(): Partial<ResponseCookie> {
  const config = getAuthConfig();
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  };
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", getAuthConfig().sessionSecret).update(encodedPayload).digest("base64url");
}

function base64url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    timingSafeEqual(Buffer.alloc(Math.max(left.length, right.length)), Buffer.alloc(Math.max(left.length, right.length)));
    return false;
  }
  return timingSafeEqual(left, right);
}
