const mediaBucket = "media";

export const mediaPaths = {
  bmw: "site/bmw.jpg",
  gow: "site/gow.webp",
  gta5: "site/gta5.jpg",
  spiderman: "site/spiderman.jpeg",
  rdr2: "site/rdr2.jpg",
} as const;

/** Return a public Supabase Storage URL while keeping local paths in one place. */
export function getMediaUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return `/${pathOrUrl.replace(/^\//, "")}`;

  return `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${mediaBucket}/${pathOrUrl.replace(/^\//, "")}`;
}
