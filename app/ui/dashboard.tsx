"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { PortRecord, RegistryStatusRow, ScanStatusRow } from "@/src/ports/types";
import { apiErrorMessage, readJson } from "./api-client";
import { useLanguage, type StatusKey, type StatusLabels } from "./i18n";

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

export function Dashboard() {
  const { copy, language } = useLanguage();
  const d = copy.dashboard;
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
      setError(apiErrorMessage(payload, d.loadFailed));
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
      setError(apiErrorMessage(payload, d.scanFailed));
      return;
    }
    const scanPayload = payload as ScanPayload;
    setScan(scanPayload);
    setMessage(d.scanComplete(scanPayload.scanResults.length));
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
      setError(apiErrorMessage(payload, d.saveFailed));
      return;
    }
    setForm(emptyForm);
    setMessage(form.id ? d.recordUpdated : d.recordCreated);
    await loadRecords();
    if (scan) await runScan();
  }

  async function deleteRecord(id: string) {
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/records/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError(apiErrorMessage(await readJson(response), d.deleteFailed));
      return;
    }
    setMessage(d.recordDeleted);
    await loadRecords();
    if (scan) await runScan();
  }

  async function importScan(row: ScanStatusRow) {
    setError(null);
    setMessage(null);
    const locale = language === "zh" ? "zh-CN" : "en-US";
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        result: row.result,
        serviceName: row.result.processName ?? d.importedService(row.result.port),
        description: d.importedDescription(new Date().toLocaleString(locale))
      })
    });
    const payload = await readJson(response);
    if (!response.ok) {
      setError(apiErrorMessage(payload, d.importFailed));
      return;
    }
    setMessage(d.imported);
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
          <h1>MyPort</h1>
          <p>{d.intro}</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={runScan} disabled={scanning} type="button">
            {scanning ? d.scanning : d.scanCurrent}
          </button>
          <button className="btn btn-secondary" onClick={logout} type="button">
            {d.logout}
          </button>
        </div>
      </header>

      <section className="stats-grid" aria-label={d.summaryLabel}>
        <Stat label={d.stats.total} value={stats.total} />
        <Stat label={d.stats.active} value={stats.active} />
        <Stat label={d.stats.unregistered} value={stats.unregistered} />
        <Stat label={d.stats.conflict} value={stats.conflict} />
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
              <h2 id="record-form-title">{form.id ? d.editRecord : d.addRecord}</h2>
            </div>
            {form.id ? (
              <button className="btn btn-secondary" onClick={() => setForm(emptyForm)} type="button">
                {d.cancelEdit}
              </button>
            ) : null}
          </div>
          <form className="form-grid" onSubmit={saveRecord}>
            <div className="field">
              <label htmlFor="serviceName">{d.serviceName}</label>
              <input
                id="serviceName"
                value={form.serviceName}
                onChange={(event) => setForm({ ...form, serviceName: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="port">{d.port}</label>
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
              <label htmlFor="protocol">{d.protocol}</label>
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
              <label htmlFor="host">{d.host}</label>
              <input
                id="host"
                value={form.host}
                onChange={(event) => setForm({ ...form, host: event.target.value })}
                placeholder="*"
              />
            </div>
            <div className="field full">
              <label htmlFor="description">{d.description}</label>
              <textarea
                id="description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
            <div className="field full">
              <button className="btn btn-primary" type="submit">
                {form.id ? d.saveChanges : d.createRecord}
              </button>
            </div>
          </form>
        </article>

        <article className="panel" aria-labelledby="scan-title">
          <div className="panel-header">
            <div>
              <h2 id="scan-title">{d.currentScan}</h2>
            </div>
            <button className="btn btn-secondary" onClick={runScan} disabled={scanning} type="button">
              {d.refreshScan}
            </button>
          </div>
          {!scan ? (
            <p className="muted">{d.noScan}</p>
          ) : scan.scanResults.length === 0 ? (
            <p className="muted">{d.noScanResults}</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{d.port}</th>
                    <th>{d.process}</th>
                    <th>{d.status}</th>
                    <th>{d.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {scan.scanResults.map((row) => (
                    <tr key={`${row.result.protocol}-${row.result.host}-${row.result.port}`}>
                      <td className="mono">
                        {row.result.protocol}/{row.result.host}:{row.result.port}
                      </td>
                      <td>{row.result.processName ?? d.unknown}</td>
                      <td>
                        <StatusBadge labels={copy.statuses} status={row.status} />
                      </td>
                      <td>
                        {row.status === "unregistered" ? (
                          <button className="btn btn-secondary" onClick={() => importScan(row)} type="button">
                            {d.import}
                          </button>
                        ) : (
                          <span className="muted">{d.registered}</span>
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
            <h2 id="registry-title">{d.registry}</h2>
          </div>
        </div>
        {loading ? (
          <p className="muted">{d.loadingRecords}</p>
        ) : records.length === 0 ? (
          <p className="muted">{d.emptyRecords}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{d.service}</th>
                  <th>{d.endpoint}</th>
                  <th>{d.description}</th>
                  <th>{d.status}</th>
                  <th>{d.actions}</th>
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
                    <td>{record.description || <span className="muted">{d.noDescription}</span>}</td>
                    <td>
                      <StatusBadge labels={copy.statuses} status={status} />
                    </td>
                    <td>
                      <div className="button-row">
                        <button className="btn btn-secondary" onClick={() => editRecord(record)} type="button">
                          {d.edit}
                        </button>
                        <button className="btn btn-danger" onClick={() => deleteRecord(record.id)} type="button">
                          {d.delete}
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

function StatusBadge({ labels, status }: { labels: StatusLabels; status: StatusKey }) {
  return <span className={`badge badge-${status}`}>{labels[status]}</span>;
}
