import { GuestApp } from "@/components/guest/guest-app";
import { getMenuReadModel } from "@/lib/menu-repository";

export const revalidate = 60;

export default async function CheckoutPage() {
  const menu = await getMenuReadModel();
  return <GuestApp view="checkout" menuData={{ products: menu.products, hours: menu.hours }} />;
}
