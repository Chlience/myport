import { requirePageAuth } from "@/src/auth/require-auth";
import { Dashboard } from "./ui/dashboard";
import { LanguageSelect } from "./ui/i18n";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage() {
  await requirePageAuth();
  return (
    <main id="main-content" className="app-shell">
      <div className="top-language-control">
        <LanguageSelect />
      </div>
      <Dashboard />
    </main>
  );
}
