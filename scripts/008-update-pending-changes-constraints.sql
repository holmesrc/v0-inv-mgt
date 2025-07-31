-- Update the pending_changes table to allow batch operations
-- First, drop the existing constraint
ALTER TABLE pending_changes DROP CONSTRAINT IF EXISTS pending_changes_change_type_check;

-- Add the new constraint that includes batch operations
ALTER TABLE pending_changes ADD CONSTRAINT pending_changes_change_type_check 
CHECK (change_type IN ('add', 'update', 'delete', 'batch_add', 'batch_update', 'batch_delete'));

-- Add a comment to document the change
COMMENT ON TABLE pending_changes IS 'Stores pending inventory changes for approval workflow. Supports individual operations (add, update, delete) and batch operations (batch_add, batch_update, batch_delete).';

-- Verify the constraint was updated
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'pending_changes'::regclass 
AND conname = 'pending_changes_change_type_check';
