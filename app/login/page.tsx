import { currentSessionStatus } from "@/src/auth/require-auth";
import { redirect } from "next/navigation";
import { LoginForm } from "../ui/login-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LoginPage() {
  const session = await currentSessionStatus();
  if (session.authenticated) {
    redirect("/");
  }

  return (
    <main id="main-content" className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <p className="eyebrow">Secure access</p>
        <h1 id="login-title">Web Port Manager</h1>
        <p>Sign in with the single account configured by environment variables.</p>
        <LoginForm />
      </section>
    </main>
  );
}
