import { errorResponse, ok } from "@/src/api/responses";
import { requireAuth } from "@/src/auth/require-auth";
import { getPortStore } from "@/src/storage/port-store";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Params) {
  try {
    await requireAuth();
    const { id } = await context.params;
    const record = await getPortStore().update(id, await request.json());
    return ok({ record });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, context: Params) {
  return PATCH(request, context);
}

export async function DELETE(_request: Request, context: Params) {
  try {
    await requireAuth();
    const { id } = await context.params;
    await getPortStore().delete(id);
    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
