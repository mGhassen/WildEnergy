-- Migration: Add is_admin column to accounts table
-- This migration simplifies the admin system by using a simple boolean instead of admin_roles table

-- 1. Add is_admin column to accounts table
ALTER TABLE accounts 
ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- 2. Update existing accounts based on admin_roles table
UPDATE accounts 
SET is_admin = true 
WHERE id IN (
    SELECT account_id 
    FROM admin_roles 
    WHERE role IN ('admin', 'super_admin', 'manager')
);

-- 3. Add comment to explain the column
COMMENT ON COLUMN accounts.is_admin IS 'Simple boolean flag indicating if the account has admin privileges';
