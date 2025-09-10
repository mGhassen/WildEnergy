-- Add 'pending' status to accounts table
-- This allows accounts to be created in pending state for approval workflow

-- Drop the existing check constraint
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_status_check;

-- Add the new check constraint with 'pending' status included
ALTER TABLE accounts ADD CONSTRAINT accounts_status_check 
  CHECK (status IN ('active', 'pending', 'suspended', 'archived'));

-- Update the default status to 'pending' for new accounts
ALTER TABLE accounts ALTER COLUMN status SET DEFAULT 'pending';

-- Add a comment to document the status meanings
COMMENT ON COLUMN accounts.status IS 'Account status: pending (awaiting approval), active (approved and active), suspended (temporarily disabled), archived (permanently disabled)';
