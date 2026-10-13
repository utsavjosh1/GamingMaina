import type { MetadataRoute } from "next";

const baseUrl = "https://gamingmaniadelhi.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/about", "/games", "/tournaments", "/contact-us", "/login", "/book-online"].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
