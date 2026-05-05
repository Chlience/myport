import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const protectedRoutes = [
  "app/api/records/route.ts",
  "app/api/records/[id]/route.ts",
  "app/api/scan/route.ts",
  "app/api/import/route.ts"
];

describe("security static checks", () => {
  it("protected route handlers call requireAuth", async () => {
    for (const file of protectedRoutes) {
      const source = await readFile(path.resolve(file), "utf8");
      expect(source).toContain("requireAuth()");
    }
  });

  it("scan adapter uses fixed execFile and no shell API", async () => {
    const source = await readFile(path.resolve("src/scan/scan-adapter.ts"), "utf8");
    expect(source).toContain("execFile");
    expect(source).toContain("SS_ARGS");
    expect(source).not.toContain("exec(");
  });

  it("app and src source contain no lifecycle-control integrations", async () => {
    const files = await listSourceFiles(["app", "src"]);
    const joined = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
    expect(joined).not.toMatch(/\bsystemctl\b/);
    expect(joined).not.toMatch(/\bdocker\b/);
    expect(joined).not.toMatch(/\bservice\s+(restart|stop|start)\b/);
  });
});

async function listSourceFiles(roots: string[]): Promise<string[]> {
  const result: string[] = [];
  for (const root of roots) {
    await walk(path.resolve(root), result);
  }
  return result.filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));
}

async function walk(dir: string, result: string[]) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, result);
    else result.push(full);
  }
}
