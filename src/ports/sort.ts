import type { RegistryStatusRow } from "./types";

export type RegistrySortField = "port" | "createdAt";
export type SortDirection = "asc" | "desc";

export type RegistrySort = {
  field: RegistrySortField;
  direction: SortDirection;
};

export const DEFAULT_REGISTRY_SORT: RegistrySort = {
  field: "createdAt",
  direction: "desc"
};

export function nextSortDirection(direction: SortDirection): SortDirection {
  return direction === "asc" ? "desc" : "asc";
}

export function sortRegistryRows(rows: RegistryStatusRow[], sort: RegistrySort): RegistryStatusRow[] {
  return [...rows].sort((left, right) => {
    const comparison = compareRegistryRows(left, right, sort.field);
    return sort.direction === "asc" ? comparison : -comparison;
  });
}

function compareRegistryRows(left: RegistryStatusRow, right: RegistryStatusRow, field: RegistrySortField): number {
  if (field === "port") {
    return left.record.port - right.record.port;
  }

  return timestamp(left.record.createdAt) - timestamp(right.record.createdAt);
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
