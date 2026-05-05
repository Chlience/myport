# PRD: MyPort

## Status

- Consensus status: **APPROVED**
- Source spec: `.omx/specs/deep-interview-web-port-manager.md`
- Context snapshot: `.omx/context/web-port-manager-20260505T042754Z.md`
- Test spec: `.omx/plans/test-spec-web-port-manager.md`
- Planning mode: RALPLAN deliberate mode, because external access + authentication create security risk.

## Requirements Summary

Build a simple externally accessible Web app for the current server. The app lets one authenticated operator maintain a manual registry of service names, ports, and descriptions, scan the server's currently listening ports, compare scan results with saved records, and import scan results into the registry.

The app is a metadata manager only. It must not mutate real services, edit service configs, restart/stop processes, manage Docker/systemd, manage multiple servers, or add monitoring/alerts/history.

## RALPLAN-DR Summary

### Principles

1. **Metadata-only management** — the app stores and edits its own registry only; it never changes live services.
2. **Manual registry is source of truth** — scan results are read-only comparison/import helpers.
3. **Secure-by-default external access** — every page and API is protected by single-account auth.
4. **Simple first version** — single server, single account, local JSON persistence, no roles, no alerts, no lifecycle control.
5. **Read-only scan boundary** — port scanning uses a fixed allowlisted command and cannot accept arbitrary commands/arguments.

### Decision Drivers

1. **Safety boundary** — make real service mutation impossible by design.
2. **Small-server maintainability** — keep deployment and operations simple.
3. **Auth + persistence reliability** — external access and saved records are first-version requirements.

### Viable Options

#### Option A — Next.js App Router + TypeScript + atomic JSON storage (**chosen**)

Pros:
- One cohesive full-stack app.
- Good UI runway and TypeScript domain modeling.
- Avoids native database dependencies for a tiny single-user registry.
- JSON storage is simple to inspect and back up.

Cons:
- Requires discipline around App Router auth, server-only code, and cookies.
- JSON needs explicit atomic-write, validation, corruption, and write-serialization handling.

Why chosen:
- Best fit for “simple first version” plus a polished Web UI.
- Meets the deep-interview boundary allowing JSON/SQLite local persistence.

#### Option B — Next.js App Router + TypeScript + SQLite

Pros:
- Stronger query/constraint model if records grow.
- Easier unique constraints and transactional writes.

Cons:
- `node:sqlite` is still release-candidate / experimental-adjacent in current Node docs.
- Mature SQLite drivers introduce native dependency/build concerns.
- More operational surface than needed for a small single-user registry.

Disposition:
- Defer. Use SQLite later if data size, concurrency, or query complexity outgrow JSON.

#### Option C — Express + Vite React + JSON/SQLite

Pros:
- Explicit API/frontend split.
- Backend auth and scan boundaries are straightforward.

Cons:
- More wiring for a small greenfield tool.
- SPA auth edge cases and duplicate build/deploy surfaces.

Disposition:
- Viable but not preferred for this single-purpose app.

#### Option D — FastAPI + Jinja/HTMX + JSON/SQLite

Pros:
- Excellent for small admin tools.
- Minimal frontend build complexity.

Cons:
- Less aligned with modern frontend UX preference.
- Existing execution/tooling lane is likely simpler in TypeScript/Next.

Disposition:
- Viable fallback if Node/Next constraints block execution.

### Pre-mortem

1. **Service mutation creep**
   - Failure: later implementation adds restart/stop/open-port buttons near scan results.
   - Mitigation: no lifecycle dependencies, no mutation endpoints, fixed scan adapter, tests grep/inspect for forbidden commands.

2. **UI is protected but APIs are exposed**
   - Failure: login redirects pages, but direct API calls work without a session.
   - Mitigation: `proxy.ts` only for coarse redirects; every Route Handler / Server Action calls shared `requireAuth`; direct unauthenticated API tests cover each endpoint.

3. **Scan/registry statuses mislead the user**
   - Failure: duplicate records, wildcard hosts, and missing scan rows produce incorrect status labels.
   - Mitigation: pure comparison function, normalized conflict key, fixture tests, explicit status definitions.

4. **JSON file corruption or concurrent writes lose data**
   - Failure: interrupted write or overlapping import/edit corrupts `data/ports.json`.
   - Mitigation: write queue, temp-file + rename atomic writes, schema validation, timestamped `.corrupt` backup and visible storage error.

## Product Scope

### In scope

- Single-server app for current machine.
- Single-account login.
- Credentials from server-only environment variables:
  - `PORT_MANAGER_USERNAME`
  - `PORT_MANAGER_PASSWORD`
  - `PORT_MANAGER_SESSION_SECRET`
  - optional `PORT_MANAGER_DATA_PATH`
  - optional `PORT_MANAGER_COOKIE_SECURE`
- Login/session protection for all app pages and APIs.
- Manual registry CRUD.
- Read-only port scan.
- Scan/import into registry.
- Status labels:
  - `active`
  - `unregistered`
  - `not_running`
  - `conflict`
- Reverse-proxy-compatible deployment docs.
- UX uses the project-local `ui-ux-pro-max` skill at `.codex/skills/ui-ux-pro-max`.

### Out of scope

- Real port/service mutation.
- Editing service config/env files.
- Restarting/stopping/killing processes.
- Docker/systemd control.
- Multi-server inventory.
- Multi-user accounts, roles, permissions.
- Historical monitoring, charts, alerts, notifications.
- HTTPS/certificate/domain automation inside the app.

## UX Requirements

The requested UI/UX skill is available as project-local `ui-ux-pro-max` at `.codex/skills/ui-ux-pro-max`. It was status-checked on 2026-05-05: Python is available, the search CLI help runs, and a design-system smoke query for “MyPort” succeeds. Use this skill for the frontend UX pass.

Required UX outcomes:
- Responsive dashboard layout.
- Clear registry table/cards with service name, port, protocol, host, description, status.
- Status badges with distinct labels and colors for active/unregistered/not-running/conflict.
- Empty states for no records and no scan results.
- Scan action with loading and sanitized error state.
- Import flow that lets the user confirm/edit service name and description before saving.
- Accessible labels for forms, buttons, and status text.
- No UI affordance for restart/stop/reconfigure/service-control actions.

## Domain Model

### Port record

```ts
type Protocol = "tcp" | "udp";

type PortRecord = {
  id: string;
  serviceName: string;
  port: number;
  protocol: Protocol;
  host: string; // default "*" for wildcard/all interfaces when user does not specify
  description: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
};
```

### Scan result

```ts
type ScanResult = {
  protocol: Protocol;
  host: string;
  port: number;
  processName?: string;
  pid?: number;
  rawAddress?: string;
};
```

### Status definitions

- `active`: a saved record matches a current scan result by normalized conflict key.
- `unregistered`: a current scan result has no matching saved record.
- `not_running`: a saved record has no matching current scan result.
- `conflict`: two or more saved records share the same normalized conflict key.

Conflict key:
- Normalize as `protocol + normalizedHostGroup + port`.
- Treat wildcard/all-interface hosts (`*`, `0.0.0.0`, `::`, empty host) as the same wildcard group.
- For MVP, duplicate registry entries are conflicts. Do not attempt OS-level bind-conflict simulation beyond scan comparison.

## Architecture

### Chosen stack

- Next.js App Router + TypeScript.
- Local atomic JSON persistence.
- Server-only scan adapter using Node `child_process.execFile`.
- Cookie session signed with HMAC using `PORT_MANAGER_SESSION_SECRET`.
- Tests sized around domain functions, route handlers, and browser flows.

### Planned file areas

Exact names may change during implementation, but the intended structure is:

```text
app/
  login/
  page.tsx
  api/
    auth/login/route.ts
    auth/logout/route.ts
    auth/session/route.ts
    records/route.ts
    records/[id]/route.ts
    scan/route.ts
    import/route.ts
proxy.ts
src/
  auth/
    session.ts
    require-auth.ts
  storage/
    port-store.ts
    schema.ts
  ports/
    compare.ts
    validation.ts
    types.ts
  scan/
    scan-adapter.ts
    parse-ss.ts
  ui/
    components...
data/
  ports.json
```

## Auth Requirements

- All pages except `/login` require a valid session.
- All APIs require `requireAuth` except:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/session` if implemented as safe session-check returning only auth status.
- Use `proxy.ts` for coarse unauthenticated page redirects.
- Do not rely on `proxy.ts` alone for authorization.
- Every protected Route Handler / Server Action must call a shared server-side `requireAuth`.
- Use async `cookies()` in App Router code.
- Credentials and session secret are server-only env vars; never prefix with `NEXT_PUBLIC_`.
- Session cookie:
  - name: `port_manager_session`
  - `HttpOnly`
  - `SameSite=Lax` or stricter
  - `Secure=true` by default in production, with local-dev override only
  - max age: default 7 days unless execution chooses a safer shorter value
  - signed/HMAC-protected with `PORT_MANAGER_SESSION_SECRET`
- `PORT_MANAGER_SESSION_SECRET` should be required and at least 32 bytes/chars of entropy.
- Use constant-time comparison for credential checks where practical.
- Never log credentials, session cookie values, or secret material.

## Persistence Requirements

- Default data path: `data/ports.json` or env override `PORT_MANAGER_DATA_PATH`.
- Store an object with a schema version and record array.
- Validate schema on every read.
- Serialize writes in process with a write queue/mutex.
- Write atomically:
  1. write full next state to temp file in same directory,
  2. fsync if practical,
  3. rename temp file over target.
- On parse or validation failure:
  - rename bad file to timestamped `.corrupt` backup where possible,
  - fail closed with a visible storage error, or start empty only with an explicit visible warning and preserved corrupt backup.
- Records must persist across app restart.
- SQLite migration is a future follow-up only if data/concurrency grows.

## Scan Requirements

- Use one allowlisted read-only scan adapter.
- Use `execFile`, not shell interpolation.
- No user-supplied executable or args.
- Candidate fixed command: `ss` with fixed args for listening TCP/UDP ports.
- Include timeout.
- Sanitize errors before returning to UI.
- Tolerate missing process metadata due to permissions.
- Parser must handle IPv4, IPv6, wildcard/all-interface, and malformed rows.
- Import writes only to this app's JSON registry; import does not modify any real service.
- Forbidden commands/capabilities:
  - `systemctl`
  - `service`
  - `docker`
  - `kill`
  - arbitrary shell
  - writes to service configs/env files

## Endpoint Inventory

Protected pages:
- `/`
- registry page/sections
- scan page/sections

Public pages:
- `/login`

Public or limited APIs:
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session` if implemented; returns no secrets.

Protected APIs:
- `GET /api/records`
- `POST /api/records`
- `PUT/PATCH /api/records/:id`
- `DELETE /api/records/:id`
- `GET/POST /api/scan`
- `POST /api/import`

Every protected API must reject direct unauthenticated requests.

## Acceptance Criteria

1. Unauthenticated users cannot access any app page except login.
2. Unauthenticated users cannot access protected API endpoints directly.
3. Login succeeds with valid env username/password.
4. Login fails with invalid credentials.
5. Login creates signed `port_manager_session` cookie.
6. Logout invalidates/removes the session.
7. Missing or weak required auth env config fails closed with a clear startup/runtime error.
8. User can create a registry record with service name, port, protocol, host, and description.
9. User can edit an existing registry record.
10. User can delete a registry record.
11. Invalid ports outside `1..65535` are rejected.
12. Records persist after app restart.
13. JSON storage writes are atomic and serialized.
14. Corrupt JSON storage is preserved as `.corrupt` and surfaced safely.
15. Scan lists currently listening ports using a fixed read-only allowlisted command.
16. Scan parser handles representative IPv4/IPv6/wildcard rows and missing process info.
17. Scan result marks listening ports not in registry as `unregistered`.
18. Registry marks saved records not currently listening as `not_running`.
19. Duplicate saved records by normalized conflict key are marked `conflict`.
20. User can import a scanned port into the registry and edit its service name/description before or after save.
21. Imported records persist as normal manual records.
22. No endpoint, UI action, command, dependency path, or documentation suggests real service mutation/restart/stop/Docker/systemd control.
23. Documentation states HTTPS/domain are handled by external reverse proxy.
24. Documentation lists env vars and warns not to commit secrets.
25. UI includes accessible forms, visible status badges, empty states, loading states, and sanitized error states.

## Implementation Plan

### Step 1 — Scaffold and baseline

- Create Next.js + TypeScript app.
- Add lint, typecheck, test, and build scripts.
- Add basic app shell and login route.
- Add `.gitignore` for env/data/build artifacts.

### Step 2 — Domain model and JSON store

- Implement types, validation, conflict-key normalization.
- Implement atomic JSON store with schema version, write queue, corruption handling.
- Unit-test validation/store behavior before UI depends on it.

### Step 3 — Auth/session layer

- Implement env validation, credential check, HMAC-signed session cookie.
- Add `proxy.ts` page redirect guard.
- Add shared `requireAuth` for Route Handlers / Server Actions.
- Add login/logout/session endpoints.
- Test unauthenticated direct API access.

### Step 4 — Registry API and UI

- Implement CRUD endpoints.
- Implement registry dashboard with create/edit/delete.
- Add conflict and not-running placeholders wired to comparison later.
- Add accessible form validation and sanitized errors.

### Step 5 — Read-only scan adapter

- Implement fixed `execFile` scan adapter with timeout.
- Implement `ss` parser fixtures.
- Add scan endpoint protected by `requireAuth`.
- Sanitize scan errors.

### Step 6 — Comparison and import

- Implement pure comparison function.
- Add scan view with active/unregistered/not-running/conflict statuses.
- Add import flow from scan result to registry record.
- Ensure import only writes app registry metadata.

### Step 7 — UX pass

- Use `.codex/skills/ui-ux-pro-max/SKILL.md`.
- Start with a design-system query for the MyPort dashboard, then apply the recommendations selectively to this admin UI.
- Improve status badges, layout, empty/loading/error states, import confirmation, responsive behavior, accessible labels.

### Step 8 — Documentation

- Add README with setup, env vars, run/build commands.
- Document external reverse-proxy/TLS responsibility.
- Document non-goals and safety boundaries.
- Document scan command assumptions.

### Step 9 — Verification and security review

- Run unit/integration/e2e/security/observability checks from test spec.
- Run lint/typecheck/build.
- Verify no service mutation code exists.
- Produce acceptance matrix.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| API endpoints left unprotected | Shared `requireAuth` in every protected route + direct unauthenticated API tests |
| Proxy relied on as auth boundary | `proxy.ts` only for redirects; server-side guards are mandatory |
| JSON corruption/data loss | Atomic writes, write queue, schema validation, `.corrupt` backup |
| Scan command injection | `execFile` fixed command/args, no shell, no user input |
| Scan parser brittle | Fixtures for IPv4/IPv6/wildcard/missing process/malformed rows |
| Process metadata unavailable | Treat process name/PID as optional; port/protocol/host remain primary |
| External exposure without TLS | Document reverse proxy; secure cookie default in production |
| Secrets leaked to browser/logs | No `NEXT_PUBLIC_` secrets, sanitized logs/errors |
| UI/UX skill auto-routing mismatch | Project-local `ui-ux-pro-max` exists and works; if a future session does not auto-list it, load `.codex/skills/ui-ux-pro-max/SKILL.md` directly |
| Scope creep into service control | Tests and docs forbid systemctl/docker/kill/config writes |

## Verification Steps

Execution should prove:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

If exact script names differ, implementation must provide equivalent checks and document them.

Manual smoke:
1. Start app with env credentials and data path.
2. Visit `/` unauthenticated; confirm redirect to `/login`.
3. Directly call protected APIs without cookie; confirm rejection.
4. Log in.
5. Create/edit/delete registry record.
6. Run scan.
7. Import a scanned port.
8. Create duplicate record and confirm conflict label.
9. Restart app and confirm records persist.
10. Confirm no restart/stop/reconfigure/Docker/systemd controls exist.

## ADR

### Decision

Build MyPort as a **Next.js App Router + TypeScript** app with **atomic JSON local persistence**, single-account env-based authentication, HMAC-signed cookie sessions, server-side route guards, read-only `ss` scan adapter, and no service lifecycle mutation.

### Drivers

- Simple single-server MVP.
- Manual registry source of truth.
- External access requires auth.
- Read-only scan boundary must be enforceable.
- Greenfield repo allows stack choice.

### Alternatives considered

- Next.js + SQLite: deferred; useful later for larger data/concurrency, but unnecessary now and adds driver/runtime choices.
- Express + Vite: viable but more app surfaces.
- FastAPI + Jinja/HTMX: viable but less aligned with frontend polish path.
- Docker/systemd/service manager: rejected by explicit non-goals.

### Why chosen

Next.js + TypeScript gives a cohesive Web app and UI path, while JSON persistence keeps the MVP simpler than SQLite and still reliable with atomic writes and validation.

### Consequences

Positive:
- Small deployable app.
- Human-inspectable data.
- Strong server-only scan/auth boundaries.
- Good UX runway.

Negative:
- JSON store requires careful write/corruption handling.
- Next App Router auth must be implemented carefully.
- Future data/concurrency growth may require SQLite migration.

### Follow-ups

- Consider SQLite migration only after real data/concurrency pressure.
- Persist the `ui-ux-pro-max` design system during frontend implementation if the execution lane needs reusable page-level design rules.
- Add reverse-proxy examples after implementation chooses port/run command.

## Available-Agent-Types Roster

Relevant available roles:
- `explore`
- `planner`
- `architect`
- `critic`
- `executor`
- `debugger`
- `test-engineer`
- `security-reviewer`
- `designer`
- `writer`
- `verifier`
- `build-fixer`
- `code-reviewer`
- `dependency-expert`
- `researcher`

Frontend/UX:
- Use project-local `ui-ux-pro-max` for the dashboard design system.
- Use `designer` for synthesis/implementation guidance when helpful.
- Use `visual-verdict` only if screenshots/references are introduced.

## Follow-up Staffing Guidance

### `$ralph` path

Use for sequential completion with verification pressure.

Suggested lanes:
- `executor` (medium): scaffold, domain, store, auth, routes, UI, scan/import.
- `test-engineer` (medium): unit/integration/e2e coverage.
- `security-reviewer` (high): auth/session, external exposure, scan command safety.
- `designer` (medium): UX pass/status badges/forms/states.
- `verifier` (high): acceptance matrix and final evidence.

Launch hint:

```text
$ralph .omx/plans/prd-web-port-manager.md .omx/plans/test-spec-web-port-manager.md
```

### `$team` path

Use if parallel execution is desired after plan approval.

Suggested lanes:
1. Foundation/auth — `executor`, medium/high.
2. Domain/JSON store/comparison — `executor`, medium.
3. Scan/import — `executor` or `debugger`, high.
4. UX/UI — `designer` + `executor`, medium.
5. Tests — `test-engineer`, medium.
6. Security — `security-reviewer`, high.
7. Final verification — `verifier`, high.

Launch hint:

```text
$team .omx/plans/prd-web-port-manager.md .omx/plans/test-spec-web-port-manager.md
```

Team verification path:
1. Each lane reports changed files and local checks.
2. Integration merge runs lint/typecheck/build/tests.
3. Security gate verifies auth on every API and fixed read-only scan adapter.
4. E2E gate verifies login, CRUD, scan, import, labels.
5. Verifier maps every acceptance criterion to evidence.

## Applied Review Improvements

- Replaced SQLite MVP with JSON-first atomic persistence and SQLite follow-up only.
- Added layered auth: `proxy.ts` plus route-level `requireAuth`.
- Added exact session cookie/security requirements.
- Added fixed allowlisted scan command boundary.
- Added JSON corruption/concurrency behavior.
- Added precise conflict key semantics.
- Updated UI/UX status: project-local `ui-ux-pro-max` is installed and smoke-tested; frontend pass should use it.
- Expanded endpoint inventory and verification gates.
