import type { Protocol, ScanResult } from "@/src/ports/types";
import { normalizeHost, normalizePort } from "@/src/ports/validation";

export function parseSsOutput(output: string): ScanResult[] {
  const results: ScanResult[] = [];
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("Netid")) continue;
    const parsed = parseSsLine(trimmed);
    if (parsed) results.push(parsed);
  }
  return results;
}

function parseSsLine(line: string): ScanResult | null {
  const columns = line.split(/\s+/);
  const protocol = parseProtocol(columns[0]);
  if (!protocol) return null;

  const localAddress = findLocalAddress(columns);
  if (!localAddress) return null;

  const parsedAddress = parseAddressPort(localAddress);
  if (!parsedAddress) return null;

  const process = parseProcess(line);
  return {
    protocol,
    host: normalizeHost(parsedAddress.host),
    port: parsedAddress.port,
    rawAddress: localAddress,
    ...(process.processName ? { processName: process.processName } : {}),
    ...(process.pid ? { pid: process.pid } : {})
  };
}

function parseProtocol(value: string | undefined): Protocol | null {
  if (value === "tcp" || value === "udp") return value;
  return null;
}

function findLocalAddress(columns: string[]): string | undefined {
  for (const column of columns) {
    const parsed = parseAddressPort(column);
    if (parsed) return column;
  }
  return undefined;
}

function parseAddressPort(value: string): { host: string; port: number } | null {
  if (!value.includes(":")) return null;

  const bracketMatch = value.match(/^\[(.*)]:(\d+)$/);
  if (bracketMatch) {
    return safeAddress(bracketMatch[1] ?? "*", bracketMatch[2]);
  }

  const starMatch = value.match(/^(\*):(\d+)$/);
  if (starMatch) {
    return safeAddress(starMatch[1] ?? "*", starMatch[2]);
  }

  const lastColon = value.lastIndexOf(":");
  if (lastColon < 0) return null;
  const host = value.slice(0, lastColon);
  const port = value.slice(lastColon + 1);
  return safeAddress(host || "*", port);
}

function safeAddress(host: string, portValue: string | undefined): { host: string; port: number } | null {
  try {
    return { host, port: normalizePort(portValue) };
  } catch {
    return null;
  }
}

function parseProcess(line: string): { processName?: string; pid?: number } {
  const name = line.match(/users:\(\("([^"]+)"/)?.[1];
  const pidText = line.match(/pid=(\d+)/)?.[1];
  const pid = pidText ? Number(pidText) : undefined;
  return {
    ...(name ? { processName: name } : {}),
    ...(Number.isInteger(pid) ? { pid } : {})
  };
}
