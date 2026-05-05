import { NextResponse } from "next/server";
import { ConfigError } from "@/src/auth/env";
import { UnauthorizedError, unauthorizedResponse } from "@/src/auth/require-auth";
import { NotFoundError, StorageCorruptionError } from "@/src/storage/port-store";
import { ValidationError } from "@/src/ports/validation";

export function ok<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return unauthorizedResponse();
  }
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: { code: "validation_error", message: error.message, issues: error.issues } },
      { status: 400 }
    );
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: { code: "not_found", message: error.message } }, { status: 404 });
  }
  if (error instanceof StorageCorruptionError) {
    return NextResponse.json(
      {
        error: {
          code: "storage_corrupt",
          message: "Stored port data is corrupt. A backup was preserved.",
          backupPath: error.backupPath
        }
      },
      { status: 500 }
    );
  }
  if (error instanceof ConfigError) {
    return NextResponse.json(
      { error: { code: "configuration_error", message: error.message } },
      { status: 500 }
    );
  }
  return NextResponse.json(
    { error: { code: "internal_error", message: "Unexpected server error." } },
    { status: 500 }
  );
}
