import { errorResponse, ok } from "@/src/api/responses";
import { requireAuth } from "@/src/auth/require-auth";
import type { ScanResult } from "@/src/ports/types";
import { getPortStore } from "@/src/storage/port-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = (await request.json()) as {
      result?: Partial<ScanResult>;
      serviceName?: string;
      description?: string;
    };
    const result = body.result;
    const record = await getPortStore().create({
      serviceName: body.serviceName ?? result?.processName ?? `Port ${result?.port ?? ""}`,
      port: result?.port,
      protocol: result?.protocol,
      host: result?.host,
      description: body.description ?? ""
    });
    return ok({ record }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
