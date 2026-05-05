# Test Spec: Web Port Manager

## Status

- Consensus status: **APPROVED**
- PRD: `.omx/plans/prd-web-port-manager.md`
- Requirements source: `.omx/specs/deep-interview-web-port-manager.md`

## Test Strategy

The test suite must prove five claims:

1. External access is protected by authentication at page and API levels.
2. Registry CRUD persists safely through atomic JSON storage.
3. Scanning is read-only, fixed-command, and safe.
4. Registry/scan comparison labels are correct and not misleading.
5. The app contains no service mutation/lifecycle-control feature.

## Unit Test Plan

### Auth/session

- `validateEnv` accepts required env vars.
- `validateEnv` rejects missing username.
- `validateEnv` rejects missing password.
- `validateEnv` rejects missing or too-short session secret.
- `validateCredentials` accepts exact configured username/password.
- `validateCredentials` rejects wrong username.
- `validateCredentials` rejects wrong password.
- credential comparison does not log secrets.
- `signSession` creates a token containing non-secret session claims.
- `verifySession` accepts a valid signed token.
- `verifySession` rejects tampered payload.
- `verifySession` rejects tampered signature.
- `verifySession` rejects expired token.
- session cookie options include:
  - `HttpOnly`
  - `SameSite=Lax` or stricter
  - `Secure=true` in production unless local-dev override is explicitly set
  - `maxAge` or expiry

### Registry validation

- Valid record passes with `serviceName`, `port`, `protocol`, `host`, `description`.
- Missing service name rejected.
- Blank service name rejected.
- Port `0` rejected.
- Negative port rejected.
- Port `65536` rejected.
- Non-integer port rejected.
- Unsupported protocol rejected.
- Missing protocol defaults to `tcp` if implementation supports defaults.
- Missing host defaults to wildcard/all-interface marker if implementation supports defaults.
- Description is stored as string and safely rendered.

### Conflict-key normalization

- Same protocol + same host + same port produces same key.
- `*`, empty host, `0.0.0.0`, and `::` normalize to wildcard group.
- Different protocols on same port are not duplicate registry conflicts unless implementation intentionally treats them as one UI warning.
- Duplicate saved records with same normalized key produce `conflict`.
- Scan active matching uses the same normalized key rules.
- Duplicate registry conflict is distinguished from scanned/unregistered state.

### Comparison logic

- Saved record + matching scan result => `active`.
- Scan result without saved record => `unregistered`.
- Saved record without matching scan result => `not_running`.
- Two saved records same normalized key => both marked `conflict`.
- Conflict status takes precedence over active/not-running on duplicate saved records.
- Multiple scanned rows for same normalized key are deduplicated or displayed consistently.
- Empty registry + scan results yields only unregistered scan statuses.
- Registry + empty scan yields not-running records.

### JSON store

- Initializes empty store when data file does not exist.
- Reads valid data file.
- Rejects invalid schema.
- On parse failure, preserves original as timestamped `.corrupt` backup.
- On validation failure, preserves original as timestamped `.corrupt` backup.
- Atomic write uses temp file then rename.
- Concurrent writes are serialized by write queue/mutex.
- Create persists record.
- Update persists changed record.
- Delete persists removal.
- Restart/reopen reads persisted data.
- Write failure returns safe error and does not expose file internals unnecessarily.

### Scan parser

- Parses representative `ss` TCP listening row.
- Parses representative UDP row if UDP is included.
- Parses IPv4 address.
- Parses IPv6 address.
- Parses wildcard/all-interface address.
- Extracts port from `host:port` forms.
- Tolerates missing process metadata.
- Parses process name/PID when present.
- Ignores malformed rows safely.
- Does not throw on unknown header/spacing variations.
- Normalizes protocol, host, port, processName, pid.

### Scan adapter safety

- Calls fixed executable only, e.g. `ss`.
- Calls fixed args only.
- Uses `execFile`, not shell interpolation.
- Does not accept user-supplied command.
- Does not accept user-supplied args.
- Applies timeout.
- Sanitizes subprocess error before returning to caller.

## Integration Test Plan

### Endpoint auth inventory

Direct unauthenticated requests must be rejected for:

- `GET /api/records`
- `POST /api/records`
- `PUT/PATCH /api/records/:id`
- `DELETE /api/records/:id`
- `GET/POST /api/scan`
- `POST /api/import`

Unauthenticated page access:
- `/` redirects to `/login` or equivalent auth flow.
- protected registry/scan routes redirect to `/login`.

Allowed unauthenticated endpoints:
- `POST /api/auth/login` accepts credentials and returns session only on valid login.
- `POST /api/auth/logout` is safe and does not leak session data.
- `GET /api/auth/session`, if implemented, returns only safe auth status.

Authenticated requests:
- Authenticated `GET /api/records` succeeds.
- Authenticated create/update/delete succeeds with valid input.
- Authenticated scan succeeds.
- Authenticated import succeeds.

### Registry API

- Create valid record returns persisted record.
- Create invalid port returns validation error.
- Create blank service name returns validation error.
- Update valid record changes `updatedAt`.
- Update nonexistent record returns 404.
- Delete existing record removes it.
- Delete nonexistent record returns 404 or idempotent documented behavior.
- Duplicate records are allowed only if displayed as conflict, or rejected if implementation chooses stricter semantics; behavior must match PRD and tests.

### Persistence

- Records persist after app/server restart or store reinitialization.
- Two rapid create/update/import operations do not corrupt JSON.
- Corrupt data file is renamed to `.corrupt` and app surfaces safe storage error/warning.
- Storage errors return stable API error shape.

### Scan endpoint

- Uses mocked/fake scan adapter for deterministic tests.
- Returns normalized scan results.
- Handles scan timeout as sanitized error.
- Handles missing `ss` command as sanitized error with setup guidance.
- Does not invoke mutation commands.

### Import endpoint

- Import unregistered scan result creates registry record.
- Import allows or requires service name/description completion.
- Imported record can be edited later.
- Import duplicate follows documented behavior:
  - either blocks duplicate with clear message,
  - or allows duplicate and marks conflict.
- Import does not write outside the registry data file.

## E2E Test Plan

Use Playwright or equivalent if available.

### Auth flow

1. Visit `/`.
2. Confirm redirect/login prompt.
3. Submit wrong credentials.
4. Confirm visible error and no app access.
5. Submit correct env credentials.
6. Confirm dashboard loads.
7. Logout.
8. Confirm protected page is blocked again.

### Registry flow

1. Log in.
2. Confirm empty state when no records exist.
3. Add record:
   - service name: `chat web`
   - port: `3000`
   - protocol: `tcp`
   - description: sample text
4. Confirm record appears.
5. Edit description.
6. Confirm updated text appears.
7. Delete record.
8. Confirm empty state returns.

### Scan/import flow

Use mocked scan results in test mode when possible.

1. Log in.
2. Run scan.
3. Confirm scan loading state.
4. Confirm scanned port rows appear.
5. Confirm unregistered badge on scanned port with no registry record.
6. Click import.
7. Confirm import edit/confirmation UI.
8. Save imported record with service name/description.
9. Confirm registry shows imported record.
10. Confirm status becomes active when matching scan exists.

### Status label flow

1. Add record with port not present in mocked scan.
2. Confirm `not_running` label.
3. Add duplicate saved record for same protocol/host/port.
4. Confirm `conflict` label appears.
5. Confirm conflict label is clear and accessible.

### UX/accessibility smoke

- Forms have labels.
- Status badges include text, not color only.
- Keyboard can reach login, add, edit, scan, import, logout controls.
- Error messages are visible and not raw stack traces.
- Layout is usable on narrow viewport.

## Security Test Plan

### Auth and session

- Every protected API direct call without cookie fails.
- Every protected API direct call with tampered cookie fails.
- Expired cookie fails.
- Login response never returns password or session secret.
- Logs do not include credential values.
- Secrets are never exposed in client bundle or `NEXT_PUBLIC_` env usage.
- Cookie flags match PRD.
- Production mode defaults cookie `Secure=true`.

### Command safety

- Static or unit test confirms scan adapter uses `execFile`.
- Static or unit test confirms no shell interpolation for scan.
- Static or unit test confirms executable and args are constants/allowlisted.
- User input cannot alter scan command or args.
- Forbidden command strings are absent from implementation paths except documentation/tests describing non-goals:
  - `systemctl`
  - `service restart`
  - `docker`
  - `kill`
  - arbitrary shell command execution
- No endpoint exists for restart/stop/reconfigure/service-control.

### Data safety

- JSON data file path defaults inside project data directory.
- Env override path is validated enough to avoid accidental secret overwrite if implemented.
- API errors do not leak full server stack traces in production.
- Corrupt file backup name does not expose secrets.

## Observability Test Plan

- Startup log includes app start and data path presence, not secrets.
- Startup or first auth check reports missing auth env as safe configuration error.
- Scan log includes start, completion, duration, count.
- Scan timeout/error log is sanitized.
- Storage corruption log identifies file and backup path but not record contents if sensitive descriptions might exist.
- API errors use stable shape, e.g. `{ error: { code, message } }`.
- Build/runtime logs do not include env credential or session secret.

## Static Review Checklist

Before completion, reviewer/verifier must inspect or automate checks for:

- No source code endpoint for service mutation.
- No UI labels/buttons for restart/stop/reconfigure.
- No Docker/systemd lifecycle integration.
- No arbitrary command runner.
- Auth guard imported/called by every protected route handler.
- `proxy.ts` does not replace route-level auth checks.
- `cookies()` is used according to current App Router async behavior.
- Server-only modules do not run in client components.
- Env secrets are server-only and not `NEXT_PUBLIC_`.
- README documents reverse proxy/TLS as external.

## Acceptance Matrix Template

| PRD criterion | Evidence required | Status |
|---|---|---|
| Pages protected | E2E unauth redirect | pending |
| APIs protected | Integration direct unauth API tests | pending |
| Login success/fail | Unit + E2E auth tests | pending |
| CRUD works | Integration + E2E registry tests | pending |
| Persistence after restart | Store unit/integration test | pending |
| Scan lists ports | Scan adapter/parser tests + E2E mock | pending |
| Status labels correct | Comparison unit + E2E labels | pending |
| Import works | Integration + E2E import | pending |
| No mutation features | Static review + security tests | pending |
| Reverse proxy docs | README review | pending |

## Required Verification Commands

Implementation must provide equivalent scripts:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

If a command is unavailable, implementation must either add it or document the exact substitute and why it provides equivalent evidence.
