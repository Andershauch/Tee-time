import type { Metadata } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

export const metadata: Metadata = {
  title: "Tee-Time",
  description: "Bestilling til golfklubbens restaurant.",
};

// Nonce-based CSP is generated per request by proxy.ts.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="da">
      <body><ServiceWorkerRegister />{children}</body>
    </html>
  );
}
