import { describe, expect, it, beforeEach } from "vitest";
import { getAuthConfig } from "@/src/auth/env";
import { createSessionToken, sessionCookieOptions, validateCredentials, verifySessionToken } from "@/src/auth/session";

beforeEach(() => {
  process.env.PORT_MANAGER_USERNAME = "admin";
  process.env.PORT_MANAGER_PASSWORD = "secret-password";
  process.env.PORT_MANAGER_SESSION_SECRET = "0123456789abcdef0123456789abcdef";
  process.env.PORT_MANAGER_COOKIE_SECURE = "true";
});

describe("auth config and sessions", () => {
  it("validates env configuration", () => {
    expect(getAuthConfig().username).toBe("admin");
  });

  it("accepts and rejects credentials", () => {
    expect(validateCredentials("admin", "secret-password")).toBe(true);
    expect(validateCredentials("admin", "wrong")).toBe(false);
    expect(validateCredentials("wrong", "secret-password")).toBe(false);
  });

  it("signs, verifies, rejects tampered, and rejects expired sessions", () => {
    const token = createSessionToken(100);
    expect(verifySessionToken(token, 101)?.sub).toBe("single-user");
    expect(verifySessionToken(`${token}x`, 101)).toBeNull();
    expect(verifySessionToken(token, 100 + 60 * 60 * 24 * 8)).toBeNull();
  });

  it("sets secure cookie attributes", () => {
    const options = sessionCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.secure).toBe(true);
    expect(options.path).toBe("/");
  });
});
