import { GuestApp } from "@/components/guest/guest-app";
import { getMenuReadModel } from "@/lib/menu-repository";

export const revalidate = 60;

export default async function OffersPage() {
  const menu = await getMenuReadModel();
  return <GuestApp view="offers" menuData={{ offers: menu.offers }} />;
}
