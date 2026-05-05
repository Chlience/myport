import type {
  PortRecord,
  RegistryStatusRow,
  ScanResult,
  ScanStatusRow
} from "./types";

const WILDCARD_HOSTS = new Set(["", "*", "0.0.0.0", "::", "[::]"]);

export function normalizeHostForKey(host: string): string {
  const value = host.trim();
  if (WILDCARD_HOSTS.has(value)) {
    return "*";
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1);
  }
  return value;
}

export function conflictKey(entry: Pick<PortRecord | ScanResult, "protocol" | "host" | "port">): string {
  return `${entry.protocol}:${normalizeHostForKey(entry.host)}:${entry.port}`;
}

export function compareRegistryToScan(
  records: PortRecord[],
  scanResults: ScanResult[]
): {
  registry: RegistryStatusRow[];
  scan: ScanStatusRow[];
} {
  const registryKeyCounts = new Map<string, number>();
  for (const record of records) {
    const key = conflictKey(record);
    registryKeyCounts.set(key, (registryKeyCounts.get(key) ?? 0) + 1);
  }

  const scanKeys = new Set(scanResults.map(conflictKey));
  const registryKeys = new Set(records.map(conflictKey));

  const registry = records.map<RegistryStatusRow>((record) => {
    const key = conflictKey(record);
    if ((registryKeyCounts.get(key) ?? 0) > 1) {
      return { record, status: "conflict" };
    }
    return { record, status: scanKeys.has(key) ? "active" : "not_running" };
  });

  const seenScanKeys = new Set<string>();
  const scan: ScanStatusRow[] = [];
  for (const result of scanResults) {
    const key = conflictKey(result);
    if (seenScanKeys.has(key)) continue;
    seenScanKeys.add(key);
    scan.push({
      result,
      status: registryKeys.has(key) ? "active" : "unregistered"
    });
  }

  return { registry, scan };
}
