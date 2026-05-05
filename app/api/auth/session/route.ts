import { currentSessionStatus } from "@/src/auth/require-auth";
import { errorResponse, ok } from "@/src/api/responses";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(await currentSessionStatus());
  } catch (error) {
    return errorResponse(error);
  }
}
