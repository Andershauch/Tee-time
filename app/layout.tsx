import type { Metadata } from "next";
import { Manrope, Spectral } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

const spectral = Spectral({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-spectral", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-manrope", display: "swap" });

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
    <html lang="da" className={`${spectral.variable} ${manrope.variable}`}>
      <body><ServiceWorkerRegister />{children}</body>
    </html>
  );
}
