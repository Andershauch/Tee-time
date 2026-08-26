import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/auth/access";
import { InviteStaffForm } from "@/components/admin/invite-staff-form";

export const dynamic = "force-dynamic";

export default async function InviteStaffPage() {
  const staff = await currentStaff();
  if (!staff) redirect("/auth/sign-in");
  if (staff.role !== "admin") redirect("/adgang-naegtet");

  return (
    <div className="menuadmin-page">
      <h1>Inviter medarbejder</h1>
      <p className="lede">Opret en ny personale- eller adminkonto. Personen får med det samme en mail til selv at vælge en adgangskode.</p>
      <InviteStaffForm />
    </div>
  );
}
