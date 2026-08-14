import { GuestApp } from "@/components/guest/guest-app";
import { getMenuReadModel } from "@/lib/menu-repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return <GuestApp view="home" menuData={await getMenuReadModel()} />;
}
