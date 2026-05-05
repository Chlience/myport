import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const tempDir = await mkdtemp(path.join(os.tmpdir(), "myport-e2e-"));
const port = 4123 + Math.floor(Math.random() * 1000);
const baseUrl = `http://127.0.0.1:${port}`;
const dataPath = path.join(tempDir, "ports.json");
const fixturePath = path.join(tempDir, "ss.txt");

await writeFile(
  fixturePath,
  `Netid State  Recv-Q Send-Q Local Address:Port Peer Address:PortProcess
tcp   LISTEN 0      511          0.0.0.0:3000      0.0.0.0:*    users:(("node",pid=123,fd=18))
tcp   LISTEN 0      128             [::]:5432         [::]:*    users:(("postgres",pid=456,fd=9))
`,
  "utf8"
);

const env = {
  ...process.env,
  PORT_MANAGER_USERNAME: "admin",
  PORT_MANAGER_PASSWORD: "secret-password",
  PORT_MANAGER_SESSION_SECRET: "0123456789abcdef0123456789abcdef",
  PORT_MANAGER_COOKIE_SECURE: "false",
  PORT_MANAGER_DATA_PATH: dataPath,
  PORT_MANAGER_SCAN_FIXTURE: fixturePath
};

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], {
  cwd: root,
  env,
  stdio: ["ignore", "pipe", "pipe"]
});

let logs = "";
server.stdout.on("data", (chunk) => {
  logs += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  logs += chunk.toString();
});

try {
  await waitForServer();

  const apiUnauth = await fetch(`${baseUrl}/api/records`, { redirect: "manual" });
  assert(apiUnauth.status === 401, "protected API rejects unauthenticated requests");

  const pageUnauth = await fetch(`${baseUrl}/`, { redirect: "manual" });
  assert(pageUnauth.status >= 300 && pageUnauth.status < 400, "protected page redirects");

  const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "wrong" })
  });
  assert(badLogin.status === 401, "bad credentials rejected");

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "secret-password" })
  });
  assert(login.ok, "valid credentials accepted");
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert(Boolean(cookie), "session cookie set");

  const create = await fetch(`${baseUrl}/api/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ serviceName: "chat web", port: 3000, protocol: "tcp", host: "*", description: "Chat UI" })
  });
  assert(create.status === 201, "record created");

  const scan = await fetch(`${baseUrl}/api/scan`, { headers: { Cookie: cookie } });
  const scanPayload = await scan.json();
  assert(scan.ok, "scan succeeds");
  assert(
    scanPayload.registryStatuses.some((row) => row.record.port === 3000 && row.status === "active"),
    "registered scanned port marked active"
  );
  assert(
    scanPayload.scanResults.some((row) => row.result.port === 5432 && row.status === "unregistered"),
    "unknown scanned port marked unregistered"
  );

  const importResponse = await fetch(`${baseUrl}/api/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      result: { protocol: "tcp", host: "*", port: 5432, processName: "postgres" },
      serviceName: "pg",
      description: "Postgres metadata"
    })
  });
  assert(importResponse.status === 201, "scan result imported");

  const records = await fetch(`${baseUrl}/api/records`, { headers: { Cookie: cookie } });
  const recordsPayload = await records.json();
  assert(recordsPayload.records.length === 2, "imported record persisted");

  const appPage = await fetch(`${baseUrl}/`, { headers: { Cookie: cookie } });
  const html = await appPage.text();
  assert(appPage.ok && html.includes("MyPort"), "authenticated app page renders");

  console.log("E2E smoke passed");
} finally {
  if (!server.killed) {
    server.kill("SIGTERM");
  }
  await Promise.race([
    once(server, "exit"),
    new Promise((resolve) => setTimeout(resolve, 5000))
  ]);
  await rm(tempDir, { recursive: true, force: true });
}

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server did not start. Logs:\n${logs}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}
