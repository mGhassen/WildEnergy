-- Remove sessions_remaining column from subscriptions table
-- This is now handled by subscription_group_sessions table

-- Remove the column
ALTER TABLE subscriptions DROP COLUMN IF EXISTS sessions_remaining;

-- Add a comment explaining the change
COMMENT ON TABLE subscriptions IS 'Subscriptions table - session tracking is now handled by subscription_group_sessions table';

