-- Migration: Drop admin_roles table
-- This migration removes the admin_roles table since we're using is_admin in accounts instead

-- 1. Drop the admin_roles table
DROP TABLE IF EXISTS admin_roles CASCADE;

-- 2. Add comment to explain the simplified approach
COMMENT ON TABLE accounts IS 'Authentication and access control for all users. Admin status is determined by is_admin boolean.';
