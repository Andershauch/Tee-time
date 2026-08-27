import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tee-Time · Roskilde Golf Restaurant",
    short_name: "Tee-Time",
    description: "Bestilling til golfklubbens restaurant.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3ec",
    theme_color: "#1e3328",
    categories: ["food", "lifestyle"],
    icons: [
      { src: "/images/pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/images/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
