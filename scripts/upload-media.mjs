import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const publicDir = new URL("../public/", import.meta.url);

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !key && "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);
  throw new Error(
    `Missing/empty media upload env: ${missing.join(", ")}. ` +
      "Add a server-only Supabase secret key to .env.local; the publishable key cannot upload media."
  );
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const names = {
  "BMW.jpg": "bmw.jpg",
  "GOW.webp": "gow.webp",
  "gts5.jpg": "gta5.jpg",
  "marvels-spider-man-2048x2048-11609.jpeg": "spiderman.jpeg",
  "rdr2.jpg": "rdr2.jpg",
  "og-image.svg": "og-image.svg",
};
const contentTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const files = (await readdir(publicDir)).filter((file) => names[file]);
if (files.length !== Object.keys(names).length) {
  throw new Error(`Expected ${Object.keys(names).length} media files, found ${files.length}.`);
}

for (const file of files) {
  const destination = `site/${names[file]}`;
  const body = await readFile(join(publicDir.pathname, file));
  const { error } = await supabase.storage.from("media").upload(destination, body, {
    contentType: contentTypes[extname(file).toLowerCase()],
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error(`Upload failed for ${file}: ${error.message}`);
  console.log(`Uploaded ${file} -> ${destination}`);
}

console.log(`Uploaded ${files.length} media assets to ${url}/storage/v1/object/public/media/`);
