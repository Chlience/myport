import { mkdir, open, readFile, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { PortRecord, PortRecordInput, PortStoreData } from "@/src/ports/types";
import { assertPortRecord, validateRecordInput, ValidationError } from "@/src/ports/validation";

const SCHEMA_VERSION = 1;

export class StorageCorruptionError extends Error {
  constructor(
    message: string,
    public readonly backupPath?: string
  ) {
    super(message);
    this.name = "StorageCorruptionError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Record not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export function defaultDataPath(): string {
  const configured = process.env.PORT_MANAGER_DATA_PATH;
  if (!configured) {
    return path.join(process.cwd(), "data", "ports.json");
  }
  return path.isAbsolute(configured)
    ? configured
    : path.join(/*turbopackIgnore: true*/ process.cwd(), configured);
}

export class PortStore {
  private writeChain: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath = defaultDataPath()) {}

  get path(): string {
    return this.filePath;
  }

  async list(): Promise<PortRecord[]> {
    const data = await this.readData();
    return data.records;
  }

  async create(input: Partial<PortRecordInput>): Promise<PortRecord> {
    const normalized = validateRecordInput(input);
    const now = new Date().toISOString();
    const record: PortRecord = {
      id: randomUUID(),
      ...normalized,
      createdAt: now,
      updatedAt: now
    };

    await this.updateData((data) => ({
      ...data,
      records: [...data.records, record]
    }));

    return record;
  }

  async update(id: string, input: Partial<PortRecordInput>): Promise<PortRecord> {
    let updated: PortRecord | undefined;
    await this.updateData((data) => {
      const existing = data.records.find((record) => record.id === id);
      if (!existing) {
        throw new NotFoundError();
      }
      const normalized = validateRecordInput({
        serviceName: input.serviceName ?? existing.serviceName,
        port: input.port ?? existing.port,
        protocol: input.protocol ?? existing.protocol,
        host: input.host ?? existing.host,
        description: input.description ?? existing.description
      });
      updated = {
        ...existing,
        ...normalized,
        updatedAt: new Date().toISOString()
      };
      return {
        ...data,
        records: data.records.map((record) => (record.id === id ? updated! : record))
      };
    });
    return updated!;
  }

  async delete(id: string): Promise<void> {
    await this.updateData((data) => {
      if (!data.records.some((record) => record.id === id)) {
        throw new NotFoundError();
      }
      return {
        ...data,
        records: data.records.filter((record) => record.id !== id)
      };
    });
  }

  async replaceAll(records: PortRecord[]): Promise<void> {
    for (const record of records) {
      assertPortRecord(record);
    }
    await this.updateData((data) => ({
      ...data,
      records
    }));
  }

  private async updateData(mutator: (data: PortStoreData) => PortStoreData): Promise<void> {
    const next = this.writeChain.then(async () => {
      const current = await this.readData();
      const updated = mutator(current);
      this.assertData(updated);
      await this.writeData(updated);
    });
    this.writeChain = next.catch(() => undefined);
    await next;
  }

  private async readData(): Promise<PortStoreData> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return { schemaVersion: SCHEMA_VERSION, records: [] };
      }
      throw error;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      this.assertData(parsed);
      return parsed;
    } catch (error) {
      const backupPath = await this.backupCorruptFile();
      throw new StorageCorruptionError(
        error instanceof Error ? `Port data is corrupt: ${error.message}` : "Port data is corrupt.",
        backupPath
      );
    }
  }

  private assertData(value: unknown): asserts value is PortStoreData {
    if (!value || typeof value !== "object") {
      throw new ValidationError("Store data must be an object.");
    }
    const data = value as Partial<PortStoreData>;
    if (data.schemaVersion !== SCHEMA_VERSION) {
      throw new ValidationError("Unsupported store schema version.");
    }
    if (!Array.isArray(data.records)) {
      throw new ValidationError("Store records must be an array.");
    }
    for (const record of data.records) {
      assertPortRecord(record);
    }
  }

  private async writeData(data: PortStoreData): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    const handle = await open(tempPath, "w");
    try {
      await handle.writeFile(`${JSON.stringify(data, null, 2)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(tempPath, this.filePath);
  }

  private async backupCorruptFile(): Promise<string | undefined> {
    const backupPath = `${this.filePath}.${new Date().toISOString().replace(/[:.]/g, "-")}.corrupt`;
    try {
      await rename(this.filePath, backupPath);
      return backupPath;
    } catch {
      return undefined;
    }
  }
}

let singleton: PortStore | undefined;

export function getPortStore(): PortStore {
  singleton ??= new PortStore();
  return singleton;
}

export function resetPortStoreForTests(filePath?: string): PortStore {
  singleton = new PortStore(filePath);
  return singleton;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
