import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyPort",
  description: "Metadata-only dashboard for current server service ports."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
