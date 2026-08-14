import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/auth/access";
import { getStaffOrders } from "@/lib/staff-orders";
import { StaffDashboard } from "@/components/staff/staff-dashboard";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const staff = await currentStaff();
  if (!staff) redirect("/auth/sign-in");
  return <StaffDashboard initialOrders={await getStaffOrders()} displayName={staff.displayName} role={staff.role} />;
}
