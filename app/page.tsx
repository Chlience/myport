import { requirePageAuth } from "@/src/auth/require-auth";
import { Dashboard } from "./ui/dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage() {
  await requirePageAuth();
  return (
    <main id="main-content" className="app-shell">
      <Dashboard />
    </main>
  );
}
