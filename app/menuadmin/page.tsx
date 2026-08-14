import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/auth/access";
import { getAdminCatalog } from "@/lib/admin-catalog";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function MenuAdminPage() {
  const staff = await currentStaff();
  if (!staff) redirect("/auth/sign-in");
  if (staff.role !== "admin") redirect("/adgang-naegtet");
  return <AdminDashboard catalog={await getAdminCatalog()} displayName={staff.displayName} />;
}
