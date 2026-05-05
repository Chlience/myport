import { errorResponse, ok } from "@/src/api/responses";
import { requireAuth } from "@/src/auth/require-auth";
import { compareRegistryToScan } from "@/src/ports/compare";
import { scanListeningPorts } from "@/src/scan/scan-adapter";
import { getPortStore } from "@/src/storage/port-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAuth();
    const [records, scanResults] = await Promise.all([getPortStore().list(), scanListeningPorts()]);
    const compared = compareRegistryToScan(records, scanResults);
    return ok({
      scanResults: compared.scan,
      registryStatuses: compared.registry
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export const POST = GET;
