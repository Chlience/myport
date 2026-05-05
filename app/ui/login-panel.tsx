"use client";

import { useLanguage } from "./i18n";
import { LoginForm } from "./login-form";

export function LoginPanel() {
  const { copy } = useLanguage();

  return (
    <section className="login-card" aria-labelledby="login-title">
      <div className="panel-header">
        <div>
          <h1 id="login-title">MyPort</h1>
        </div>
      </div>
      <p>{copy.login.intro}</p>
      <LoginForm />
    </section>
  );
}
