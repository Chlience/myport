import type { Metadata } from "next";
import { LanguageProvider } from "./ui/i18n";
import { SkipLink } from "./ui/skip-link";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyPort",
  description: "Metadata-only dashboard for current server service ports."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <SkipLink />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
