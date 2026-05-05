import type { PortRecord, PortRecordInput, Protocol } from "./types";

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: string[] = [message]
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export function normalizeProtocol(protocol: unknown): Protocol {
  if (protocol === undefined || protocol === null || protocol === "") {
    return "tcp";
  }
  if (protocol === "tcp" || protocol === "udp") {
    return protocol;
  }
  throw new ValidationError("Unsupported protocol.", ["Protocol must be tcp or udp."]);
}

export function normalizeHost(host: unknown): string {
  if (typeof host !== "string" || host.trim() === "") {
    return "*";
  }
  const value = host.trim();
  if (value === "0.0.0.0" || value === "::" || value === "[::]" || value === "localhost") {
    return value;
  }
  return value;
}

export function normalizePort(port: unknown): number {
  const numeric = typeof port === "number" ? port : Number(port);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 65535) {
    throw new ValidationError("Port must be an integer from 1 to 65535.");
  }
  return numeric;
}

export function validateRecordInput(input: Partial<PortRecordInput>): Required<PortRecordInput> {
  const issues: string[] = [];
  const serviceName = typeof input.serviceName === "string" ? input.serviceName.trim() : "";
  if (!serviceName) {
    issues.push("Service name is required.");
  }

  let port = 0;
  try {
    port = normalizePort(input.port);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "Invalid port.");
  }

  let protocol: Protocol = "tcp";
  try {
    protocol = normalizeProtocol(input.protocol);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "Invalid protocol.");
  }

  const host = normalizeHost(input.host);
  const description = typeof input.description === "string" ? input.description.trim() : "";

  if (issues.length > 0) {
    throw new ValidationError("Invalid port record.", issues);
  }

  return {
    serviceName,
    port,
    protocol,
    host,
    description
  };
}

export function assertPortRecord(value: unknown): asserts value is PortRecord {
  if (!value || typeof value !== "object") {
    throw new ValidationError("Stored record must be an object.");
  }
  const record = value as Partial<PortRecord>;
  const issues: string[] = [];

  if (typeof record.id !== "string" || record.id.trim() === "") issues.push("id is required.");
  if (typeof record.serviceName !== "string" || record.serviceName.trim() === "") {
    issues.push("serviceName is required.");
  }
  try {
    normalizePort(record.port);
  } catch {
    issues.push("port must be 1..65535.");
  }
  try {
    normalizeProtocol(record.protocol);
  } catch {
    issues.push("protocol must be tcp or udp.");
  }
  if (typeof record.host !== "string") issues.push("host must be a string.");
  if (typeof record.description !== "string") issues.push("description must be a string.");
  if (typeof record.createdAt !== "string") issues.push("createdAt must be a string.");
  if (typeof record.updatedAt !== "string") issues.push("updatedAt must be a string.");

  if (issues.length > 0) {
    throw new ValidationError("Stored record is invalid.", issues);
  }
}
