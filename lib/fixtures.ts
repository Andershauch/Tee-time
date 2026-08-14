export type Placement = "bane" | "klubhus" | "terrasse";

export type ProductOption = {
  label: string;
  price: number;
};

export type Product = {
  id: string;
  category: string;
  name: string;
  price: number;
  description: string;
  imagePath?: string;
  allergens: string[];
  soldOut?: boolean;
  options?: ProductOption[];
};

export const categories = [
  "Burgere",
  "Sandwich & salater",
  "Fra grillen",
  "Drikkevarer",
  "Kage & dessert",
] as const;

export const products: Product[] = [
  { id: "burger-klub", category: "Burgere", name: "Klubhusburger", price: 145, description: "120 g oksebøf, bacon, cheddar, syltede agurker og husets remoulade i brioche.", allergens: ["Gluten", "Mælk", "Sennep"], options: [{ label: "Ekstra bacon", price: 15 }, { label: "Ekstra cheddar", price: 12 }, { label: "Uden løg", price: 0 }] },
  { id: "burger-kylling", category: "Burgere", name: "Kyllingeburger", price: 139, description: "Paneret kyllingeoverlår, chili-mayo, syltet rødkål og salat.", allergens: ["Gluten", "Æg", "Sennep"], options: [{ label: "Ekstra chili-mayo", price: 8 }] },
  { id: "burger-vegetar", category: "Burgere", name: "Grøntsagsburger", price: 129, description: "Sprød linsebøf, avocado, ristede løg og tomatrelish.", allergens: ["Gluten", "Sennep"] },
  { id: "sandwich-club", category: "Sandwich & salater", name: "Club sandwich", price: 119, description: "Ristet toast med kylling, bacon, æg, tomat og mayo.", allergens: ["Gluten", "Æg", "Mælk"] },
  { id: "salat-caesar", category: "Sandwich & salater", name: "Cæsarsalat", price: 115, description: "Romainesalat, bacon, parmesan, croutoner og cæsardressing.", allergens: ["Gluten", "Mælk", "Æg", "Fisk"], soldOut: true },
  { id: "fiskefrikadeller", category: "Sandwich & salater", name: "Fiskefrikadeller", price: 129, description: "Husets fiskefrikadeller med remoulade, rugbrød og citron.", allergens: ["Fisk", "Gluten", "Æg"] },
  { id: "moerbrad", category: "Fra grillen", name: "Grillet flæskemørbrad", price: 165, description: "Med sæsonens grillede grøntsager og bearnaisesauce.", allergens: ["Mælk", "Sennep"], options: [{ label: "Ekstra bearnaise", price: 10 }] },
  { id: "dagens-fangst", category: "Fra grillen", name: "Dagens fangst", price: 175, description: "Stegt fisk efter sæson, urtekartofler og citronsmør.", allergens: ["Fisk", "Mælk"] },
  { id: "entrecote", category: "Fra grillen", name: "Entrecôte 200 g", price: 245, description: "Med pommes frites, salat og bearnaisesauce.", allergens: ["Mælk"] },
  { id: "sodavand", category: "Drikkevarer", name: "Sodavand", price: 32, description: "Coca-Cola, Coca-Cola Zero eller Sprite, 0,33 L.", allergens: [] },
  { id: "fadoel", category: "Drikkevarer", name: "Fadøl 0,4 L", price: 45, description: "Kold pilsner på fad.", allergens: ["Gluten"] },
  { id: "alkoholfri", category: "Drikkevarer", name: "Alkoholfri øl", price: 42, description: "Frisk og let, 0,0 %.", allergens: ["Gluten"] },
  { id: "kaffe", category: "Drikkevarer", name: "Kaffe", price: 29, description: "Frisk brygget kaffe fra kanden.", allergens: [] },
  { id: "aeblekage", category: "Kage & dessert", name: "Æblekage med flødeskum", price: 65, description: "Husets æblekage med kanel, rasp og flødeskum.", allergens: ["Gluten", "Mælk"] },
  { id: "islagkage", category: "Kage & dessert", name: "Islagkage", price: 59, description: "Klassisk islagkage med marengs og chokolade.", allergens: ["Mælk", "Æg", "Gluten"] },
];

export const placementCopy: Record<Placement, { title: string; description: string }> = {
  bane: { title: "Jeg er ude på banen", description: "Vi gør maden klar til din ankomst" },
  klubhus: { title: "Jeg er ved klubhuset", description: "Hurtig afhentning uden kø" },
  terrasse: { title: "Jeg sidder på terrassen", description: "Bestil uden at rejse dig" },
};

export const offers = [
  { id: "lunch", title: "Ugens frokosttilbud", badge: "Hverdage", description: "En let frokost med god tid til næste runde." },
  { id: "family", title: "Familiesøndag", badge: "Søndag", description: "Noget for både store og små efter en dag i klubben." },
  { id: "19hul", title: "19. hul happy hour", badge: "Kl. 15–17", description: "Afslut runden med kolde drikke på terrassen." },
];

export function productById(id: string) {
  return products.find((product) => product.id === id);
}
