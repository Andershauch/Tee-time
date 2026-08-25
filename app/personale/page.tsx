import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/auth/access";
import { getStaffOrders } from "@/lib/staff-orders";
import { getRestaurantHours } from "@/lib/restaurant-settings";
import { StaffDashboard } from "@/components/staff/staff-dashboard";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const staff = await currentStaff();
  if (!staff) redirect("/auth/sign-in");
  const [initialOrders, hours] = await Promise.all([getStaffOrders(), getRestaurantHours()]);
  return <StaffDashboard initialOrders={initialOrders} hours={hours} displayName={staff.displayName} role={staff.role} />;
}
