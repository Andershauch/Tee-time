export const categorySeed = [
  ["category-burgers", "Burgere", "burgere"],
  ["category-sandwiches", "Sandwich & salater", "sandwich-salater"],
  ["category-grill", "Fra grillen", "fra-grillen"],
  ["category-drinks", "Drikkevarer", "drikkevarer"],
  ["category-desserts", "Kage & dessert", "kage-dessert"],
] as const;

export const allergenSeed = ["Gluten", "Mælk", "Æg", "Fisk", "Sennep"] as const;

export const productSeed = [
  { id: "product-burger-klub", categoryId: "category-burgers", slug: "burger-klub", name: "Klubhusburger", description: "120 g oksebøf, bacon, cheddar, syltede agurker og husets remoulade i brioche.", priceOre: 14500, imagePath: "/images/produktbilleder/produkter/burger-klub.webp", allergens: ["Gluten", "Mælk", "Sennep"], options: [{ id: "option-burger-klub-bacon", name: "Ekstra bacon", priceDeltaOre: 1500 }, { id: "option-burger-klub-cheddar", name: "Ekstra cheddar", priceDeltaOre: 1200 }, { id: "option-burger-klub-no-onion", name: "Uden løg", priceDeltaOre: 0 }] },
  { id: "product-burger-kylling", categoryId: "category-burgers", slug: "burger-kylling", name: "Kyllingeburger", description: "Paneret kyllingeoverlår, chili-mayo, syltet rødkål og salat.", priceOre: 13900, imagePath: "/images/produktbilleder/produkter/burger-kylling.webp", allergens: ["Gluten", "Æg", "Sennep"], options: [{ id: "option-burger-kylling-mayo", name: "Ekstra chili-mayo", priceDeltaOre: 800 }] },
  { id: "product-burger-vegetar", categoryId: "category-burgers", slug: "burger-vegetar", name: "Grøntsagsburger", description: "Sprød linsebøf, avocado, ristede løg og tomatrelish.", priceOre: 12900, imagePath: "/images/produktbilleder/produkter/burger-vegetar.webp", allergens: ["Gluten", "Sennep"], options: [] },
  { id: "product-sandwich-club", categoryId: "category-sandwiches", slug: "sandwich-club", name: "Club sandwich", description: "Ristet toast med kylling, bacon, æg, tomat og mayo.", priceOre: 11900, imagePath: "/images/produktbilleder/produkter/sandwich-club.webp", allergens: ["Gluten", "Æg", "Mælk"], options: [] },
  { id: "product-salat-caesar", categoryId: "category-sandwiches", slug: "salat-caesar", name: "Cæsarsalat", description: "Romainesalat, bacon, parmesan, croutoner og cæsardressing.", priceOre: 11500, imagePath: "/images/produktbilleder/produkter/salat-caesar.webp", allergens: ["Gluten", "Mælk", "Æg", "Fisk"], options: [], isSoldOut: true },
  { id: "product-fiskefrikadeller", categoryId: "category-sandwiches", slug: "fiskefrikadeller", name: "Fiskefrikadeller", description: "Husets fiskefrikadeller med remoulade, rugbrød og citron.", priceOre: 12900, imagePath: "/images/produktbilleder/produkter/fiskefrikadeller.webp", allergens: ["Fisk", "Gluten", "Æg"], options: [] },
  { id: "product-moerbrad", categoryId: "category-grill", slug: "moerbrad", name: "Grillet flæskemørbrad", description: "Med sæsonens grillede grøntsager og bearnaisesauce.", priceOre: 16500, imagePath: "/images/produktbilleder/produkter/moerbrad.webp", allergens: ["Mælk", "Sennep"], options: [{ id: "option-moerbrad-bearnaise", name: "Ekstra bearnaise", priceDeltaOre: 1000 }] },
  { id: "product-dagens-fangst", categoryId: "category-grill", slug: "dagens-fangst", name: "Dagens fangst", description: "Stegt fisk efter sæson, urtekartofler og citronsmør.", priceOre: 17500, imagePath: "/images/produktbilleder/produkter/dagens-fangst.webp", allergens: ["Fisk", "Mælk"], options: [] },
  { id: "product-entrecote", categoryId: "category-grill", slug: "entrecote", name: "Entrecôte 200 g", description: "Med pommes frites, salat og bearnaisesauce.", priceOre: 24500, imagePath: "/images/produktbilleder/produkter/entrecote.webp", allergens: ["Mælk"], options: [] },
  { id: "product-sodavand", categoryId: "category-drinks", slug: "sodavand", name: "Sodavand", description: "Coca-Cola, Coca-Cola Zero eller Sprite, 0,33 L.", priceOre: 3200, imagePath: "/images/produktbilleder/produkter/sodavand.webp", allergens: [], options: [] },
  { id: "product-fadoel", categoryId: "category-drinks", slug: "fadoel", name: "Fadøl 0,4 L", description: "Kold pilsner på fad.", priceOre: 4500, imagePath: "/images/produktbilleder/produkter/fadoel.webp", allergens: ["Gluten"], options: [] },
  { id: "product-alkoholfri", categoryId: "category-drinks", slug: "alkoholfri", name: "Alkoholfri øl", description: "Frisk og let, 0,0 %.", priceOre: 4200, imagePath: "/images/produktbilleder/produkter/alkoholfri.webp", allergens: ["Gluten"], options: [] },
  { id: "product-kaffe", categoryId: "category-drinks", slug: "kaffe", name: "Kaffe", description: "Frisk brygget kaffe fra kanden.", priceOre: 2900, imagePath: "/images/produktbilleder/produkter/kaffe.webp", allergens: [], options: [] },
  { id: "product-aeblekage", categoryId: "category-desserts", slug: "aeblekage", name: "Æblekage med flødeskum", description: "Husets æblekage med kanel, rasp og flødeskum.", priceOre: 6500, imagePath: "/images/produktbilleder/produkter/aeblekage.webp", allergens: ["Gluten", "Mælk"], options: [] },
  { id: "product-islagkage", categoryId: "category-desserts", slug: "islagkage", name: "Islagkage", description: "Klassisk islagkage med marengs og chokolade.", priceOre: 5900, imagePath: "/images/produktbilleder/produkter/islagkage.webp", allergens: ["Mælk", "Æg", "Gluten"], options: [] },
] as const;

export const offerSeed = [
  { id: "offer-lunch", title: "Ugens frokosttilbud", badge: "Hverdage", description: "En let frokost med god tid til næste runde.", imagePath: "/images/produktbilleder/tilbud/lunch.webp" },
  { id: "offer-family", title: "Familiesøndag", badge: "Søndag", description: "Noget for både store og små efter en dag i klubben.", imagePath: "/images/produktbilleder/tilbud/family.webp" },
  { id: "offer-19hul", title: "19. hul happy hour", badge: "Kl. 15–17", description: "Afslut runden med kolde drikke på terrassen.", imagePath: "/images/produktbilleder/tilbud/19hul.webp" },
] as const;
