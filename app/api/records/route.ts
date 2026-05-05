import { errorResponse, ok } from "@/src/api/responses";
import { requireAuth } from "@/src/auth/require-auth";
import { getPortStore } from "@/src/storage/port-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAuth();
    const records = await getPortStore().list();
    return ok({ records });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const record = await getPortStore().create(await request.json());
    return ok({ record }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
