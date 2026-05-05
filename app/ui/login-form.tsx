"use client";

import { FormEvent, useState } from "react";
import { apiErrorMessage, readJson } from "./api-client";
import { useLanguage } from "./i18n";

export function LoginForm() {
  const { copy } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password")
      })
    });
    setLoading(false);
    if (!response.ok) {
      setError(apiErrorMessage(await readJson(response), copy.login.failed));
      return;
    }
    window.location.assign("/");
  }

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <div className="field full">
        <label htmlFor="username">{copy.login.username}</label>
        <input id="username" name="username" autoComplete="username" required />
      </div>
      <div className="field full">
        <label htmlFor="password">{copy.login.password}</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error ? (
        <div className="error full" role="alert">
          {error}
        </div>
      ) : null}
      <div className="field full">
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? copy.login.loading : copy.login.submit}
        </button>
      </div>
    </form>
  );
}
