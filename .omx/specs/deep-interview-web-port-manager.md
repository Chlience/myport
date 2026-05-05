# Deep Interview Spec: MyPort

## Metadata

- Profile: standard
- Context type: greenfield
- Rounds: 7
- Final ambiguity: 13%
- Threshold: 20%
- Context snapshot: `.omx/context/web-port-manager-20260505T042754Z.md`
- Transcript: `.omx/interviews/web-port-manager-20260505T042754Z.md`
- Prompt-safe initial-context summary: not needed

## Clarity breakdown

| Dimension | Score |
|---|---:|
| Intent | 88% |
| Outcome | 88% |
| Scope | 90% |
| Constraints | 90% |
| Success Criteria | 72% |

Weighted ambiguity: `1 - (0.88*0.30 + 0.88*0.25 + 0.90*0.20 + 0.90*0.15 + 0.72*0.10) = 12.9%`.

## Intent

Build a simple Web manager for the current server's service ports so the user can quickly see which ports are associated with their own services, such as chat web apps or Postgres, and keep a human-readable registry of service names, ports, and descriptions.

## Desired outcome

A browser-based app that:

1. Requires login with a single account.
2. Shows a manually maintained registry of service/port records.
3. Lets the user create, edit, delete, and save records with service name, port, and description.
4. Can scan the current server for ports that are already in use/listening.
5. Can compare scan results with saved records and surface useful status labels.
6. Can import scan results into the manual registry.

## In scope

- Single-server Web app for the current machine.
- Manual service-port registry as the source of truth.
- Record fields should include at minimum:
  - service name
  - port number
  - description/introduction
  - enough optional metadata to support useful UI and comparison if the chosen implementation needs it
- Scan current server's used/listening ports.
- Display scan results.
- Import a scanned port into saved records.
- Mark comparison states:
  - scanned/listening but not registered
  - registered but not currently running/listening
  - port conflict or duplicate registration
  - registered and currently active
- External Web access is allowed.
- Single-account login protecting the entire Web app.
- Username/password configured via environment variables.
- HTTPS/domain handled outside this project by the user's reverse proxy.
- Planner/implementer may choose a simple tech stack and local persistence mechanism.

## Out of scope / Non-goals

- Do not actually modify running service ports.
- Do not edit service config files or environment files for other services.
- Do not restart or stop services.
- Do not manage multiple servers.
- Do not implement multi-user accounts, roles, or permissions.
- Do not implement historical monitoring, charts, alerts, or notification systems.
- Do not control Docker, systemd, or process lifecycle.
- Do not implement HTTPS certificate/domain automation inside this project.

## Decision boundaries

OMX / downstream planner may decide without further confirmation:

- Simple technology stack.
- Local persistence approach, such as SQLite or JSON, as long as it is simple and reliable for a small single-server app.
- UI layout details, component structure, and visual polish path.
- Exact scan implementation command/library, as long as it is read-only and compatible with the target server.
- Session/login implementation details, as long as credentials come from environment variables and all app pages/API routes are protected.

OMX / downstream planner must preserve:

- Metadata-only edits: never mutate or restart the user's real services.
- Manual registry remains the source of truth.
- Scan is read-only except for importing scan data into this app's own registry.
- External access requires authentication.
- TLS/domain remain external reverse-proxy responsibilities.
- Frontend preference: use the requested "ui ux pro skill" if it is available later. In this session that named skill was not available; use the closest available UX/design workflow or request installation if strict use is required.

## Constraints

- Current repository `/home/chlience/myport` is effectively greenfield: only `.omx` state/log files were found; no package/framework/app entrypoint was found.
- Keep the first version simple.
- The app may be exposed externally, so authentication must not be optional.
- Port scanning should be read-only and safe.
- Avoid unnecessary dependencies and avoid overengineering.

## Testable acceptance criteria

1. When no valid login session exists, every app page and API endpoint redirects to or rejects with login.
2. Login succeeds with username/password from environment variables and creates a session.
3. Login fails for incorrect credentials.
4. The user can add a service record with at least service name, port, and description.
5. The user can edit and save an existing service record.
6. The user can delete a service record.
7. Saved records persist after app restart.
8. The scan feature lists currently used/listening ports on the server.
9. The scan view marks scanned ports that are not registered.
10. The registry view marks records whose ports are not currently listening.
11. Duplicate/conflicting registered ports are visibly marked.
12. The user can import a scanned port into the manual registry.
13. The implementation contains no feature that changes service configuration, restarts services, stops services, or controls Docker/systemd.
14. HTTPS/domain setup is documented as an external reverse-proxy responsibility, not implemented inside the app.

## Assumptions exposed and resolved

- Assumption: "modify port" might mean changing live service config.
  - Resolution: It means editing this app's saved metadata only.
- Assumption: scanning might be the primary source of truth.
  - Resolution: Manual records are primary; scan is a comparison/import helper.
- Assumption: external access might be out of scope.
  - Resolution: External access is in scope but requires single-account auth.
- Assumption: the app might handle TLS/domain.
  - Resolution: TLS/domain are handled by the user's external reverse proxy.
- Assumption: downstream must follow a fixed tech stack.
  - Resolution: Downstream may choose a simple stack and local persistence.

## Pressure-pass findings

- Contrarian pass: challenged whether "修改并保存端口" implies real runtime mutation. It does not.
- Simplifier pass: forced first-version non-goals. The user rejected multi-server management, service mutation/restarts, multi-user permissions, monitoring/alerts, and Docker/systemd control.

## Brownfield evidence vs inference notes

- Evidence: Local listing showed no app/package/framework files in `/home/chlience/myport`, only `.omx` state/logs.
- Inference: Treat as greenfield.

## Technical context findings

- Likely app shape: small full-stack Web application with protected routes/API, local data store, read-only port scan adapter, and comparison logic.
- Security-sensitive point: because external access is allowed, auth/session protection must be part of the first version.
- Tooling caveat: "ui ux pro skill" was requested but is not present in the current available skill list.

## Handoff recommendation

Use `$ralplan` next:

```text
$plan --consensus --direct .omx/specs/deep-interview-web-port-manager.md
```

The plan should produce:

- `.omx/plans/prd-*.md`
- `.omx/plans/test-spec-*.md`

After planning, execute with `$autopilot`, `$ralph`, or `$team` depending on desired execution style.
