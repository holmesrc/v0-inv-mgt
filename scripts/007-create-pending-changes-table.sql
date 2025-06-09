-- Create pending_changes table for inventory approval workflow
CREATE TABLE IF NOT EXISTS pending_changes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('add', 'update', 'delete')),
    item_data JSONB,
    original_data JSONB,
    requested_by VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies
ALTER TABLE pending_changes ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service role
CREATE POLICY "Allow full access to pending_changes for service role" ON pending_changes
    FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_changes_status ON pending_changes(status);
CREATE INDEX IF NOT EXISTS idx_pending_changes_created_at ON pending_changes(created_at);
