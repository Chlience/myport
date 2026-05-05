import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function requireAuth(): Promise<void> {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    throw new UnauthorizedError();
  }
}

export async function requirePageAuth(): Promise<void> {
  try {
    await requireAuth();
  } catch {
    redirect("/login");
  }
}

export async function currentSessionStatus(): Promise<{ authenticated: boolean }> {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  return { authenticated: Boolean(session) };
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 });
}
