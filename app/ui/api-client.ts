export async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export function apiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return fallback;
  }
  const error = (payload as { error?: { message?: unknown; issues?: unknown } }).error;
  if (Array.isArray(error?.issues) && error.issues.every((issue) => typeof issue === "string")) {
    return error.issues.join(" ");
  }
  if (typeof error?.message === "string") {
    return error.message;
  }
  return fallback;
}
