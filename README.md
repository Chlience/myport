# Web Port Manager

Metadata-only Web dashboard for the current server's service ports.

The app lets a single authenticated operator:

- maintain a manual service/port registry,
- scan currently listening ports on the server,
- compare scan results with saved records,
- import scanned ports into the registry.

It **does not** change, restart, stop, or reconfigure real services.

## Stack

- Next.js App Router + TypeScript
- Atomic JSON local storage
- HMAC-signed HttpOnly session cookie
- Fixed read-only `ss` scan adapter

Frontend UX follows the project-local `ui-ux-pro-max` design system persisted at:

```text
design-system/web-port-manager/MASTER.md
```

## Setup

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
PORT_MANAGER_COOKIE_SECURE=true
```

For local HTTP development only, set:

```bash
PORT_MANAGER_COOKIE_SECURE=false
```

Do not commit `.env` files.

## Development

```bash
npm run dev
```

Open `http://localhost:3000`.

## Production

```bash
npm run build
npm run start -- -p 3000
```

This project intentionally does not manage HTTPS, certificates, or domains. Put it behind your external reverse proxy and terminate TLS there.

## Verification

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Or run all:

```bash
npm run verify
```

## Safety boundaries

In scope:

- app-local registry CRUD,
- fixed read-only port scan,
- importing scan metadata into this app's JSON registry.

Out of scope:

- real service port changes,
- service config edits,
- process lifecycle control,
- Docker/systemd control,
- multi-server inventory,
- multi-user roles,
- historical monitoring and alerts,
- in-app TLS/certificate/domain automation.

## Scan behavior

The scan adapter runs a fixed command using `execFile`:

```text
ss -ltnup
```

No user-supplied command or arguments are accepted. Process metadata may be missing on some systems depending on permissions; port/protocol/host remain the primary comparison fields.
