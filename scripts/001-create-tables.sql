-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  part_number TEXT NOT NULL,
  mfg_part_number TEXT,
  qty INTEGER NOT NULL DEFAULT 0,
  part_description TEXT,
  supplier TEXT,
  location TEXT,
  package TEXT,
  reorder_point INTEGER DEFAULT 10,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_inventory_part_number ON inventory(part_number);
CREATE INDEX IF NOT EXISTS idx_inventory_qty ON inventory(qty);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory(supplier);

-- Create settings table for alert configurations
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default alert settings
INSERT INTO settings (key, value) VALUES 
('alert_settings', '{
  "enabled": true,
  "dayOfWeek": 1,
  "time": "09:00",
  "defaultReorderPoint": 10
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create package_notes table for storing Excel metadata
CREATE TABLE IF NOT EXISTS package_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note TEXT,
  filename TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
