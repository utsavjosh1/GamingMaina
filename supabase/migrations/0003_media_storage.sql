-- Public, cacheable site media served through Supabase Storage/CDN.
-- Uploads are intentionally not public: deployment tooling uses the secret key.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Supabase owns storage.objects and already enables RLS on it; the app DB role
-- may create policies, but cannot ALTER the Storage-managed table itself.
DROP POLICY IF EXISTS "Public media is readable" ON storage.objects;
CREATE POLICY "Public media is readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'media');

-- No INSERT/UPDATE/DELETE policy is granted to anon or authenticated. Asset
-- deployment runs outside the browser with SUPABASE_SECRET_KEY, which
-- bypasses Storage RLS without exposing an upload endpoint to visitors.

-- image_url stores a Storage path for portability between Supabase projects;
-- the application resolves it to the current project's public CDN URL.
UPDATE public.station_types
SET image_url = CASE name
  WHEN 'PC-RTX' THEN 'site/spiderman.jpeg'
  WHEN 'PC-GTX' THEN 'site/gta5.jpg'
  WHEN 'PS5' THEN 'site/gow.webp'
  WHEN 'PS4' THEN 'site/rdr2.jpg'
  WHEN 'Virtual Reality' THEN 'site/spiderman.jpeg'
  WHEN 'Racing Wheel' THEN 'site/bmw.jpg'
  WHEN 'Billiards' THEN 'site/gta5.jpg'
  WHEN 'Air Hockey' THEN 'site/gow.webp'
  WHEN 'Shooting' THEN 'site/rdr2.jpg'
  ELSE image_url
END
WHERE name IN (
  'PC-RTX', 'PC-GTX', 'PS5', 'PS4', 'Virtual Reality',
  'Racing Wheel', 'Billiards', 'Air Hockey', 'Shooting'
);
