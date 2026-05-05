"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { PortRecord, RegistryStatusRow, ScanStatusRow } from "@/src/ports/types";
import { apiErrorMessage, readJson } from "./api-client";

type ScanPayload = {
  scanResults: ScanStatusRow[];
  registryStatuses: RegistryStatusRow[];
};

type FormState = {
  id?: string;
  serviceName: string;
  port: string;
  protocol: "tcp" | "udp";
  host: string;
  description: string;
};

const emptyForm: FormState = {
  serviceName: "",
  port: "",
  protocol: "tcp",
  host: "*",
  description: ""
};

const statusLabels = {
  active: "Active",
  unregistered: "Unregistered",
  not_running: "Not running",
  conflict: "Conflict"
} as const;

export function Dashboard() {
  const [records, setRecords] = useState<PortRecord[]>([]);
  const [scan, setScan] = useState<ScanPayload | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadRecords();
  }, []);

  const registryRows = useMemo(() => {
    if (scan) return scan.registryStatuses;
    return records.map((record) => ({ record, status: "not_running" as const }));
  }, [records, scan]);

  const stats = useMemo(() => {
    const active = registryRows.filter((row) => row.status === "active").length;
    const conflict = registryRows.filter((row) => row.status === "conflict").length;
    const unregistered = scan?.scanResults.filter((row) => row.status === "unregistered").length ?? 0;
    return { total: records.length, active, conflict, unregistered };
  }, [records.length, registryRows, scan]);

  async function loadRecords() {
    setLoading(true);
    const response = await fetch("/api/records");
    const payload = await readJson(response);
    setLoading(false);
    if (!response.ok) {
      setError(apiErrorMessage(payload, "Could not load records."));
      return;
    }
    setRecords((payload as { records: PortRecord[] }).records);
  }

  async function runScan() {
    setScanning(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/scan");
    const payload = await readJson(response);
    setScanning(false);
    if (!response.ok) {
      setError(apiErrorMessage(payload, "Scan failed."));
      return;
    }
    const scanPayload = payload as ScanPayload;
    setScan(scanPayload);
    setMessage(`Scan complete: ${scanPayload.scanResults.length} listening port entries found.`);
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const body = {
      serviceName: form.serviceName,
      port: Number(form.port),
      protocol: form.protocol,
      host: form.host,
      description: form.description
    };
    const response = await fetch(form.id ? `/api/records/${form.id}` : "/api/records", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await readJson(response);
    if (!response.ok) {
      setError(apiErrorMessage(payload, "Could not save record."));
      return;
    }
    setForm(emptyForm);
    setMessage(form.id ? "Record updated." : "Record created.");
    await loadRecords();
    if (scan) await runScan();
  }

  async function deleteRecord(id: string) {
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/records/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError(apiErrorMessage(await readJson(response), "Could not delete record."));
      return;
    }
    setMessage("Record deleted.");
    await loadRecords();
    if (scan) await runScan();
  }

  async function importScan(row: ScanStatusRow) {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        result: row.result,
        serviceName: row.result.processName ?? `Port ${row.result.port}`,
        description: `Imported from current scan on ${new Date().toLocaleString()}`
      })
    });
    const payload = await readJson(response);
    if (!response.ok) {
      setError(apiErrorMessage(payload, "Could not import scanned port."));
      return;
    }
    setMessage("Scanned port imported into registry.");
    const imported = (payload as { record: PortRecord }).record;
    setForm({
      id: imported.id,
      serviceName: imported.serviceName,
      port: String(imported.port),
      protocol: imported.protocol,
      host: imported.host,
      description: imported.description
    });
    await loadRecords();
    await runScan();
  }

  function editRecord(record: PortRecord) {
    setForm({
      id: record.id,
      serviceName: record.serviceName,
      port: String(record.port),
      protocol: record.protocol,
      host: record.host,
      description: record.description
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <>
      <header className="hero">
        <div>
          <p className="eyebrow">Metadata-only server inventory</p>
          <h1>Web Port Manager</h1>
          <p>
            Maintain your own service-port registry, scan current listeners, and import findings without
            changing any running service.
          </p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={runScan} disabled={scanning} type="button">
            {scanning ? "Scanning..." : "Scan current ports"}
          </button>
          <button className="btn btn-secondary" onClick={logout} type="button">
            Logout
          </button>
        </div>
      </header>

      <section className="stats-grid" aria-label="Port registry summary">
        <Stat label="Saved records" value={stats.total} />
        <Stat label="Active after scan" value={stats.active} />
        <Stat label="Unregistered scan" value={stats.unregistered} />
        <Stat label="Conflicts" value={stats.conflict} />
      </section>

      {message ? (
        <div className="notice" role="status" aria-live="polite">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="error" role="alert">
          {error}
        </div>
      ) : null}

      <section className="content-grid">
        <article className="panel" aria-labelledby="record-form-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Manual source of truth</p>
              <h2 id="record-form-title">{form.id ? "Edit service record" : "Add service record"}</h2>
            </div>
            {form.id ? (
              <button className="btn btn-secondary" onClick={() => setForm(emptyForm)} type="button">
                Cancel edit
              </button>
            ) : null}
          </div>
          <form className="form-grid" onSubmit={saveRecord}>
            <div className="field">
              <label htmlFor="serviceName">Service name</label>
              <input
                id="serviceName"
                value={form.serviceName}
                onChange={(event) => setForm({ ...form, serviceName: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="port">Port</label>
              <input
                id="port"
                type="number"
                min="1"
                max="65535"
                value={form.port}
                onChange={(event) => setForm({ ...form, port: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="protocol">Protocol</label>
              <select
                id="protocol"
                value={form.protocol}
                onChange={(event) => setForm({ ...form, protocol: event.target.value as "tcp" | "udp" })}
              >
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="host">Host</label>
              <input
                id="host"
                value={form.host}
                onChange={(event) => setForm({ ...form, host: event.target.value })}
                placeholder="*"
              />
            </div>
            <div className="field full">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
            <div className="field full">
              <button className="btn btn-primary" type="submit">
                {form.id ? "Save changes" : "Create record"}
              </button>
            </div>
          </form>
        </article>

        <article className="panel" aria-labelledby="scan-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Read-only comparison</p>
              <h2 id="scan-title">Current scan</h2>
            </div>
            <button className="btn btn-secondary" onClick={runScan} disabled={scanning} type="button">
              Refresh scan
            </button>
          </div>
          {!scan ? (
            <p className="muted">Run a scan to compare listening ports with the manual registry.</p>
          ) : scan.scanResults.length === 0 ? (
            <p className="muted">No listening ports were returned by the scan adapter.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Port</th>
                    <th>Process</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scan.scanResults.map((row) => (
                    <tr key={`${row.result.protocol}-${row.result.host}-${row.result.port}`}>
                      <td className="mono">
                        {row.result.protocol}/{row.result.host}:{row.result.port}
                      </td>
                      <td>{row.result.processName ?? "Unknown"}</td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td>
                        {row.status === "unregistered" ? (
                          <button className="btn btn-secondary" onClick={() => importScan(row)} type="button">
                            Import
                          </button>
                        ) : (
                          <span className="muted">Registered</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <section className="panel" aria-labelledby="registry-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Saved records</p>
            <h2 id="registry-title">Registry</h2>
          </div>
        </div>
        {loading ? (
          <p className="muted">Loading records...</p>
        ) : records.length === 0 ? (
          <p className="muted">No saved records yet. Add a service record or import from a scan.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Endpoint</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {registryRows.map(({ record, status }) => (
                  <tr key={record.id}>
                    <td>
                      <strong>{record.serviceName}</strong>
                    </td>
                    <td className="mono">
                      {record.protocol}/{record.host}:{record.port}
                    </td>
                    <td>{record.description || <span className="muted">No description</span>}</td>
                    <td>
                      <StatusBadge status={status} />
                    </td>
                    <td>
                      <div className="button-row">
                        <button className="btn btn-secondary" onClick={() => editRecord(record)} type="button">
                          Edit
                        </button>
                        <button className="btn btn-danger" onClick={() => deleteRecord(record.id)} type="button">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: keyof typeof statusLabels }) {
  return <span className={`badge badge-${status}`}>{statusLabels[status]}</span>;
}
