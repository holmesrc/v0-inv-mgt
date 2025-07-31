-- Add requester field to inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS requester TEXT;

-- Add index for requester field for faster searches
CREATE INDEX IF NOT EXISTS idx_inventory_requester ON inventory(requester);
