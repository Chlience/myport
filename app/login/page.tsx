import { currentSessionStatus } from "@/src/auth/require-auth";
import { redirect } from "next/navigation";
import { LanguageSelect } from "../ui/i18n";
import { LoginPanel } from "../ui/login-panel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LoginPage() {
  const session = await currentSessionStatus();
  if (session.authenticated) {
    redirect("/");
  }

  return (
    <main id="main-content" className="login-page">
      <div className="login-stack">
        <div className="top-language-control">
          <LanguageSelect />
        </div>
        <LoginPanel />
      </div>
    </main>
  );
}
