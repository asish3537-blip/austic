import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pausstik · Home-style meals",
    short_name: "Pausstik",
    description: "Find nearby mother-led kitchens, choose home-style meals and follow local delivery.",
    start_url: "/app-demo?source=install",
    scope: "/",
    display: "standalone",
    background_color: "#fbf8f0",
    theme_color: "#174b3b",
    categories: ["food", "lifestyle", "shopping"],
    icons: [
      { src: "/icons/pausstik-app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/pausstik-app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
