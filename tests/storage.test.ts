import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PortStore, StorageCorruptionError } from "@/src/storage/port-store";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "port-store-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("PortStore", () => {
  it("creates, updates, deletes, and persists records", async () => {
    const file = path.join(dir, "ports.json");
    const store = new PortStore(file);
    const created = await store.create({
      serviceName: "chat web",
      port: 3000,
      description: "Chat interface"
    });

    expect(await store.list()).toHaveLength(1);
    const updated = await store.update(created.id, {
      serviceName: "chat web",
      port: 3001,
      description: "Moved metadata"
    });
    expect(updated.port).toBe(3001);

    const reopened = new PortStore(file);
    expect((await reopened.list())[0]?.port).toBe(3001);

    await reopened.delete(created.id);
    expect(await reopened.list()).toEqual([]);
  });

  it("serializes concurrent writes", async () => {
    const file = path.join(dir, "ports.json");
    const store = new PortStore(file);
    await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        store.create({ serviceName: `svc-${index}`, port: 3000 + index })
      )
    );
    expect(await store.list()).toHaveLength(5);
  });

  it("backs up corrupt files and fails closed", async () => {
    const file = path.join(dir, "ports.json");
    await writeFile(file, "{bad json", "utf8");
    const store = new PortStore(file);
    await expect(store.list()).rejects.toBeInstanceOf(StorageCorruptionError);
    const files = await readdir(dir);
    expect(files.some((name) => name.endsWith(".corrupt"))).toBe(true);
  });
});
