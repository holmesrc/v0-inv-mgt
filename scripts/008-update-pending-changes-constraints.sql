-- Update the pending_changes table to support batch operations
ALTER TABLE pending_changes DROP CONSTRAINT IF EXISTS pending_changes_change_type_check;

-- Add new constraint that includes batch operations
ALTER TABLE pending_changes ADD CONSTRAINT pending_changes_change_type_check 
    CHECK (change_type IN ('add', 'update', 'delete', 'batch_add', 'batch_update', 'batch_delete'));

-- Add a comment to document the new batch types
COMMENT ON COLUMN pending_changes.change_type IS 'Type of change: add, update, delete for individual items; batch_add, batch_update, batch_delete for batch operations';
