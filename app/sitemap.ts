import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/scoofoo", "/mother-guide", "/help", "/install", "/privacy", "/partners"].map(path => ({ url: `https://paustik.in${path}`, changeFrequency: "weekly", priority: path ? .6 : 1 }));
}
