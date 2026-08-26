ALTER TABLE classes ADD COLUMN IF NOT EXISTS color TEXT;

-- Backfill from category color (same hue family); app generates shade variants on create
UPDATE classes c
SET color = cat.color
FROM categories cat
WHERE c.category_id = cat.id
  AND c.color IS NULL
  AND cat.color IS NOT NULL;

UPDATE classes
SET color = '#64748b'
WHERE color IS NULL;
