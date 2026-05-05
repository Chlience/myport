import { describe, expect, it } from "vitest";
import { compareRegistryToScan, conflictKey, normalizeHostForKey } from "@/src/ports/compare";
import { validateRecordInput } from "@/src/ports/validation";
import type { PortRecord, ScanResult } from "@/src/ports/types";

function record(overrides: Partial<PortRecord>): PortRecord {
  return {
    id: overrides.id ?? "id",
    serviceName: overrides.serviceName ?? "service",
    port: overrides.port ?? 3000,
    protocol: overrides.protocol ?? "tcp",
    host: overrides.host ?? "*",
    description: overrides.description ?? "",
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z"
  };
}

describe("registry validation", () => {
  it("accepts valid input and applies defaults", () => {
    expect(validateRecordInput({ serviceName: " chat ", port: "3000" as unknown as number })).toEqual({
      serviceName: "chat",
      port: 3000,
      protocol: "tcp",
      host: "*",
      description: ""
    });
  });

  it("rejects invalid ports and blank names", () => {
    expect(() => validateRecordInput({ serviceName: "", port: 0 })).toThrow("Invalid port record");
    expect(() => validateRecordInput({ serviceName: "pg", port: 65536 })).toThrow("Invalid port record");
  });
});

describe("comparison", () => {
  it("normalizes wildcard hosts", () => {
    expect(normalizeHostForKey("0.0.0.0")).toBe("*");
    expect(normalizeHostForKey("::")).toBe("*");
    expect(conflictKey({ protocol: "tcp", host: "[::]", port: 80 })).toBe("tcp:*:80");
  });

  it("marks active, unregistered, not-running, and conflict states", () => {
    const records = [
      record({ id: "active", port: 3000 }),
      record({ id: "stopped", port: 3001 }),
      record({ id: "dup-a", port: 5432 }),
      record({ id: "dup-b", port: 5432 })
    ];
    const scan: ScanResult[] = [
      { protocol: "tcp", host: "0.0.0.0", port: 3000 },
      { protocol: "tcp", host: "*", port: 9000 }
    ];

    const compared = compareRegistryToScan(records, scan);
    expect(compared.registry.map((row) => [row.record.id, row.status])).toEqual([
      ["active", "active"],
      ["stopped", "not_running"],
      ["dup-a", "conflict"],
      ["dup-b", "conflict"]
    ]);
    expect(compared.scan.map((row) => [row.result.port, row.status])).toEqual([
      [3000, "active"],
      [9000, "unregistered"]
    ]);
  });
});
