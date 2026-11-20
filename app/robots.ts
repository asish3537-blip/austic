import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/customer/", "/mother/", "/delivery/", "/account/", "/app-demo", "/demo-"] }, sitemap: "https://paustik.in/sitemap.xml" };
}
