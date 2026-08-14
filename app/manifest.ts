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
    icons: [{ src: "/images/tee-time-logo.png", sizes: "any", type: "image/png", purpose: "any" }],
  };
}
