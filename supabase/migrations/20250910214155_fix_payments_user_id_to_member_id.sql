-- Migration: Fix payments table to use member_id instead of user_id
-- This migration updates the payments table to be consistent with the new account system

-- 1. Drop foreign key constraint first
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;

-- 2. Rename column from user_id to member_id
ALTER TABLE payments RENAME COLUMN user_id TO member_id;

-- 3. Recreate foreign key constraint with member_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_member_id_fkey') THEN
        ALTER TABLE payments 
        ADD CONSTRAINT payments_member_id_fkey 
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Update the index name
DROP INDEX IF EXISTS idx_payments_user_id;
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);

-- 5. Add comment to document the change
COMMENT ON COLUMN payments.member_id IS 'Reference to the member who made the payment';
