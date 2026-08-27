import type { Metadata } from "next";

export const metadata: Metadata = {
  applicationName: "Tee-Time Personale",
  manifest: "/personale.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Tee-Time Personale" },
};

export default function StaffLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
