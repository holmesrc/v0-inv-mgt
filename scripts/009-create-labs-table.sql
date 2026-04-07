-- Create labs table for multi-tenant support
CREATE TABLE IF NOT EXISTS labs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,  -- URL-friendly identifier: 'pa', 'boston', 'la'
  name TEXT NOT NULL,          -- Display name: 'Pennsylvania Lab', 'Boston Lab'
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- The config JSONB stores per-lab customization:
-- {
--   "locations": { "prefix": "H", "defaultLocation": "H1-1" },
--   "suppliers": ["Mouser", "Digikey", "Newark"],
--   "locationAreas": ["Shelf A", "Shelf B", "Bench 1"],
--   "slackWebhookUrl": "",
--   "alertSettings": { "defaultReorderPoint": 10, "lowStockThreshold": 5 }
-- }

-- Add lab_id to inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS lab_id UUID REFERENCES labs(id);

-- Add lab_id to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS lab_id UUID REFERENCES labs(id);

-- Add lab_id to pending changes if it exists
ALTER TABLE pending_changes ADD COLUMN IF NOT EXISTS lab_id UUID REFERENCES labs(id);

-- Add lab_id to package_notes
ALTER TABLE package_notes ADD COLUMN IF NOT EXISTS lab_id UUID REFERENCES labs(id);

-- Create index for lab-scoped queries
CREATE INDEX IF NOT EXISTS idx_inventory_lab_id ON inventory(lab_id);
CREATE INDEX IF NOT EXISTS idx_settings_lab_id ON settings(lab_id);
CREATE INDEX IF NOT EXISTS idx_package_notes_lab_id ON package_notes(lab_id);

-- Seed the initial PA lab (your existing lab)
INSERT INTO labs (slug, name, config) VALUES
('pa', 'Pennsylvania Lab', '{
  "locations": { "prefix": "H", "defaultLocation": "H1-1" },
  "suppliers": ["Mouser", "Digikey"],
  "slackWebhookUrl": ""
}'::jsonb),
('boston', 'Boston Lab', '{
  "locations": { "prefix": "B", "defaultLocation": "B1-1" },
  "suppliers": ["Mouser", "Digikey"],
  "slackWebhookUrl": ""
}'::jsonb),
('la', 'Los Angeles Lab', '{
  "locations": { "prefix": "L", "defaultLocation": "L1-1" },
  "suppliers": ["Mouser", "Digikey"],
  "slackWebhookUrl": ""
}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Assign existing inventory to PA lab
-- Run this AFTER inserting the PA lab:
-- UPDATE inventory SET lab_id = (SELECT id FROM labs WHERE slug = 'pa') WHERE lab_id IS NULL;
-- UPDATE settings SET lab_id = (SELECT id FROM labs WHERE slug = 'pa') WHERE lab_id IS NULL;
-- UPDATE package_notes SET lab_id = (SELECT id FROM labs WHERE slug = 'pa') WHERE lab_id IS NULL;
