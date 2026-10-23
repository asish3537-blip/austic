import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Preserve the identity used by earlier installations when id was omitted.
    id: "/app-demo?source=install",
    name: "Pausstik · Home-style meals",
    short_name: "Pausstik",
    description: "Find nearby mother-led kitchens, choose home-style meals and follow local delivery.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#fbf8f0",
    theme_color: "#174b3b",
    categories: ["food", "lifestyle", "shopping"],
    icons: [
      { src: "/icons/pausstik-app-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/pausstik-app-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/pausstik-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Open Pausstik", short_name: "My app", url: "/app" },
      { name: "Help and guides", short_name: "Help", url: "/help" },
      { name: "Pausstik website", short_name: "Website", url: "/" },
    ],
  };
}
