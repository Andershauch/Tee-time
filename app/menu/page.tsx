import { GuestApp } from "@/components/guest/guest-app";
import { getMenuReadModel } from "@/lib/menu-repository";

export const revalidate = 60;

export default async function MenuPage() {
  const menu = await getMenuReadModel();
  return <GuestApp view="menu" menuData={{ categories: menu.categories, products: menu.products }} />;
}
