import type { Metadata } from "next";

export const metadata: Metadata = {
  applicationName: "Tee-Time Menuadmin",
  manifest: "/menuadmin.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Tee-Time Menuadmin" },
};

export default function MenuAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
