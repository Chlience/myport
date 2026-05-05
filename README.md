# MyPort

<p align="center">
  <strong>A safe, single-server port registry dashboard for your own services.</strong>
</p>

<p align="center">
  <a href="./README_zh.md">中文</a> · <a href="#quick-start">Quick Start</a> · <a href="#safety-boundaries">Safety Boundaries</a> · <a href="#verification">Verification</a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" />
  <img alt="Vitest" src="https://img.shields.io/badge/Vitest-tested-6E9F18?logo=vitest" />
  <img alt="Storage" src="https://img.shields.io/badge/storage-atomic%20JSON-orange" />
</p>

---

## What is MyPort?

**MyPort** is a metadata-only web dashboard for the current server's service ports. It helps you keep a human-readable registry of services such as chat apps, Postgres, internal dashboards, and other locally managed ports.

MyPort is designed for one trusted server operator. It can scan currently listening ports and compare them with your saved registry, but it never changes real services.

## Features

- **Single-account login** using server-side environment variables.
- **English/Chinese language selector** with a browser-local language preference.
- **Manual port registry** for service name, port, protocol, host, and description.
- **Read-only current-port scan** using a fixed `ss -ltnup` adapter.
- **Status labels** for:
  - `active` — registered and currently listening,
  - `unregistered` — listening but not saved,
  - `not_running` — saved but not currently listening,
  - `conflict` — duplicate saved registry key.
- **Import from scan** into the app-local registry.
- **Atomic JSON persistence** with serialized writes and corrupt-file backup.
- **Reverse-proxy friendly**: HTTPS and domain handling stay outside the app.

## Tech Stack

| Layer | Choice |
|---|---|
| App | Next.js App Router |
| Language | TypeScript |
| Auth | HMAC-signed HttpOnly session cookie |
| Storage | Atomic local JSON file |
| Scan | Fixed read-only `ss` command via `execFile` |
| Tests | Vitest + E2E smoke script |
| UX guide | Project-local `ui-ux-pro-max` design system |

The persisted design system is tracked at:

```text
design-system/myport/MASTER.md
```

## Quick Start

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```bash
PORT_MANAGER_USERNAME=admin
PORT_MANAGER_PASSWORD=use-a-strong-password
PORT_MANAGER_SESSION_SECRET=replace-with-at-least-32-random-characters
PORT_MANAGER_DATA_PATH=./data/ports.json
PORT_MANAGER_COOKIE_SECURE=false
```

Start development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Production

Build and run:

```bash
npm run build
npm run start -- -p 3000
```

Or use the local helper scripts for a background process with daily logs.
`start-myport.sh` runs `npm run build` before starting, and `restart-myport.sh` builds before stopping the current process:

```bash
./start-myport.sh
./restart-myport.sh
./log-myport.sh
./stop-myport.sh
```

The helper scripts default to port `9000` and write logs to `logs/myport-YYYY-MM-DD.log`.
Override the port when needed:

```bash
MYPORT_PORT=9001 ./start-myport.sh
MYPORT_PORT=9001 ./restart-myport.sh
MYPORT_PORT=9001 ./stop-myport.sh
```

For public access, put MyPort behind your own reverse proxy and terminate TLS there.

Recommended production env adjustment:

```bash
PORT_MANAGER_COOKIE_SECURE=true
```

## Data Storage

By default, MyPort stores records in:

```text
data/ports.json
```

You can override it:

```bash
PORT_MANAGER_DATA_PATH=/absolute/or/relative/path/to/ports.json
```

The data file is intentionally ignored by Git.

## Safety Boundaries

MyPort is intentionally **metadata-only**.

In scope:

- app-local registry CRUD,
- fixed read-only port scan,
- importing scan metadata into MyPort's own JSON registry.

Out of scope:

- changing real service ports,
- editing service config or env files,
- restarting/stopping/killing processes,
- Docker or systemd control,
- multi-server inventory,
- multi-user roles,
- historical monitoring and alerts,
- in-app TLS/certificate/domain automation.

## Scan Behavior

The scan adapter runs a fixed command using `execFile`:

```text
ss -ltnup
```

No user-supplied command or arguments are accepted. Process names and PIDs may be missing depending on system permissions; port, protocol, and host remain the primary comparison fields.

## Verification

Run the full verification stack:

```bash
npm run verify
```

Or run checks separately:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm audit --audit-level=moderate
```

## Repository Name

The GitHub repository name is intended to remain lowercase:

```text
myport
```

The product/project display name is:

```text
MyPort
```
