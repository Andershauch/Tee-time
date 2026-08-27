import { GuestApp } from "@/components/guest/guest-app";
import { getMenuReadModel } from "@/lib/menu-repository";

export const revalidate = 60;

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const menu = await getMenuReadModel();
  return <GuestApp view="product" productId={slug} menuData={{ products: menu.products.filter((product) => product.id === slug) }} />;
}
