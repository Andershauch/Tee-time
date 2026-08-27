import { GuestApp } from "@/components/guest/guest-app";
import { getMenuReadModel } from "@/lib/menu-repository";

export const revalidate = 60;

export default async function CartPage() {
  const menu = await getMenuReadModel();
  return <GuestApp view="cart" menuData={{ products: menu.products }} />;
}
