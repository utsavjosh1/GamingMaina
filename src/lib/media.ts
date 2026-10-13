const mediaBucket = "media";

export const mediaPaths = {
  bmw: "site/bmw.jpg",
  gow: "site/gow.webp",
  gta5: "site/gta5.jpg",
  spiderman: "site/spiderman.jpeg",
  rdr2: "site/rdr2.jpg",
} as const;

const localMediaFallbacks: Record<string, string> = {
  "site/bmw.jpg": "/BMW.jpg",
  "site/gow.webp": "/GOW.webp",
  "site/gta5.jpg": "/gts5.jpg",
  "site/spiderman.jpeg": "/marvels-spider-man-2048x2048-11609.jpeg",
  "site/rdr2.jpg": "/rdr2.jpg",
  "site/og-image.svg": "/og-image.svg",
};

/** Return a public Supabase Storage URL while keeping local paths in one place. */
export function getMediaUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;

  const normalizedPath = pathOrUrl.replace(/^\//, "");
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return localMediaFallbacks[normalizedPath] ?? `/${normalizedPath}`;

  return `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${mediaBucket}/${normalizedPath}`;
}
