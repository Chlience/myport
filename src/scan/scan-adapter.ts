import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import type { ScanResult } from "@/src/ports/types";
import { parseSsOutput } from "./parse-ss";

const execFileAsync = promisify(execFile);
const SCAN_TIMEOUT_MS = 5000;
const SS_ARGS = ["-ltnup"];

export class ScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScanError";
  }
}

export async function scanListeningPorts(): Promise<ScanResult[]> {
  const fixturePath = process.env.PORT_MANAGER_SCAN_FIXTURE;
  if (fixturePath) {
    return parseSsOutput(await readFile(fixturePath, "utf8"));
  }

  try {
    const { stdout } = await execFileAsync("ss", SS_ARGS, {
      timeout: SCAN_TIMEOUT_MS,
      maxBuffer: 1024 * 1024
    });
    return parseSsOutput(stdout);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scan error.";
    throw new ScanError(`Unable to scan listening ports with ss: ${sanitize(message)}`);
  }
}

function sanitize(message: string): string {
  return message.replace(/[^\w\s.():/-]/g, "").slice(0, 240);
}
