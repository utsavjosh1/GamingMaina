-- Gaming Mania Delhi reference data.
-- Schema, RLS, triggers, and transactional functions live in migrations/.
-- Run with `supabase db reset` or `supabase db seed`; this file is safe to rerun.

INSERT INTO public.station_types (name, category, base_price_per_hour, image_url) VALUES
  ('PC-RTX', 'COMPETITIVE', 15000, 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop'),
  ('PC-GTX', 'CASUAL', 10000, 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=600&auto=format&fit=crop'),
  ('PS5', 'NEXT-GEN', 20000, 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=600&auto=format&fit=crop'),
  ('PS4', 'CO-OP', 15000, 'https://images.unsplash.com/photo-1486401899868-0e435ed85128?q=80&w=600&auto=format&fit=crop'),
  ('Virtual Reality', 'IMMERSIVE', 25000, 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?q=80&w=600&auto=format&fit=crop'),
  ('Racing Wheel', 'SIMULATOR', 18000, 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=600&auto=format&fit=crop'),
  ('Billiards', 'LOUNGE', 20000, 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=600&auto=format&fit=crop'),
  ('Air Hockey', 'ARCADE', 15000, 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=600&auto=format&fit=crop'),
  ('Shooting', 'CASUAL', 15000, 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop')
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category, base_price_per_hour = EXCLUDED.base_price_per_hour, image_url = EXCLUDED.image_url;

DO $$
DECLARE type_rec RECORD; quantity INT; i INT;
BEGIN
  FOR type_rec IN SELECT id, name FROM public.station_types LOOP
    quantity := CASE type_rec.name
      WHEN 'PC-RTX' THEN 5 WHEN 'PC-GTX' THEN 5 WHEN 'PS5' THEN 3
      WHEN 'PS4' THEN 3 WHEN 'Virtual Reality' THEN 2 WHEN 'Racing Wheel' THEN 2
      WHEN 'Billiards' THEN 2 WHEN 'Air Hockey' THEN 1 WHEN 'Shooting' THEN 2 ELSE 1 END;
    FOR i IN 1..quantity LOOP
      INSERT INTO public.stations (station_type_id, name, status)
      VALUES (type_rec.id, type_rec.name || ' #' || i, 'available')
      ON CONFLICT (name) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

INSERT INTO public.pricing_rules (station_type_id, name, rule_type, discount_percent, conditions, is_active, priority)
SELECT NULL, v.name, v.rule_type, v.discount_percent, v.conditions::jsonb, true, v.priority
FROM (VALUES
  ('Happy Hour (Weekdays 2-5PM)', 'happy_hour', 20, '{"days":["mon","tue","wed","thu","fri"],"start":"14:00","end":"17:00"}', 10),
  ('Gold Member Discount', 'membership_discount', 15, '{"membership":"gold"}', 5),
  ('Silver Member Discount', 'membership_discount', 10, '{"membership":"silver"}', 5),
  ('Platinum Member Discount', 'membership_discount', 25, '{"membership":"platinum"}', 5)
) AS v(name, rule_type, discount_percent, conditions, priority)
WHERE NOT EXISTS (SELECT 1 FROM public.pricing_rules r WHERE r.name = v.name);

INSERT INTO public.pricing_rules (station_type_id, name, rule_type, fixed_price, conditions, is_active, priority)
SELECT id, '5-Hour PC-RTX Package', 'package', 60000, '{"min_hours":5}', true, 15
FROM public.station_types WHERE name = 'PC-RTX'
  AND NOT EXISTS (SELECT 1 FROM public.pricing_rules WHERE name = '5-Hour PC-RTX Package');
