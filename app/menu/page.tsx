import { GuestApp } from "@/components/guest/guest-app";
import { getMenuReadModel } from "@/lib/menu-repository";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  return <GuestApp view="menu" menuData={await getMenuReadModel()} />;
}
