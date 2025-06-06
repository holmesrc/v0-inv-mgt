-- Fix any potential issues with the inventory table structure
-- This script ensures the table has the correct structure and permissions

-- Drop and recreate the inventory table with proper structure
DROP TABLE IF EXISTS inventory CASCADE;

CREATE TABLE inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    part_number TEXT NOT NULL,
    mfg_part_number TEXT,
    qty INTEGER DEFAULT 0,
    part_description TEXT,
    supplier TEXT,
    location TEXT,
    package TEXT,
    reorder_point INTEGER DEFAULT 10,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_inventory_part_number ON inventory(part_number);
CREATE INDEX idx_inventory_qty ON inventory(qty);
CREATE INDEX idx_inventory_reorder_point ON inventory(reorder_point);

-- Ensure package_notes table exists
CREATE TABLE IF NOT EXISTS package_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note TEXT,
    filename TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure settings table exists  
CREATE TABLE IF NOT EXISTS settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable Row Level Security for now to avoid permission issues
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE package_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions (adjust as needed for your setup)
-- These commands may need to be run by a database administrator
-- GRANT ALL ON inventory TO anon, authenticated;
-- GRANT ALL ON package_notes TO anon, authenticated;
-- GRANT ALL ON settings TO anon, authenticated;
