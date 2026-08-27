import type { Metadata } from "next";
import { Manrope, Spectral } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

const spectral = Spectral({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-spectral", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: "Tee-Time",
  description: "Bestilling til golfklubbens restaurant.",
  applicationName: "Tee-Time",
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tee-Time",
  },
  icons: {
    icon: [
      { url: "/images/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/images/pwa-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="da" className={`${spectral.variable} ${manrope.variable}`}>
      <body><ServiceWorkerRegister />{children}</body>
    </html>
  );
}
