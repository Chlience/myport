import { describe, expect, it } from "vitest";
import { sortRegistryRows } from "@/src/ports/sort";
import type { PortRecord, RegistryStatusRow } from "@/src/ports/types";

function row(id: string, port: number, createdAt: string): RegistryStatusRow {
  return {
    record: record({ id, port, createdAt }),
    status: "not_running"
  };
}

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

describe("registry sorting", () => {
  const rows = [
    row("later-low", 3000, "2026-05-02T00:00:00.000Z"),
    row("earlier-high", 5432, "2026-05-01T00:00:00.000Z"),
    row("latest-mid", 4000, "2026-05-03T00:00:00.000Z")
  ];

  it("sorts by port in both directions", () => {
    expect(sortRegistryRows(rows, { field: "port", direction: "asc" }).map((entry) => entry.record.id)).toEqual([
      "later-low",
      "latest-mid",
      "earlier-high"
    ]);
    expect(sortRegistryRows(rows, { field: "port", direction: "desc" }).map((entry) => entry.record.id)).toEqual([
      "earlier-high",
      "latest-mid",
      "later-low"
    ]);
  });

  it("sorts by created time in both directions", () => {
    expect(sortRegistryRows(rows, { field: "createdAt", direction: "asc" }).map((entry) => entry.record.id)).toEqual([
      "earlier-high",
      "later-low",
      "latest-mid"
    ]);
    expect(sortRegistryRows(rows, { field: "createdAt", direction: "desc" }).map((entry) => entry.record.id)).toEqual([
      "latest-mid",
      "later-low",
      "earlier-high"
    ]);
  });
});
