-- Remove sessions_remaining column from subscriptions table
-- This is now handled by subscription_group_sessions table

-- Remove the column
ALTER TABLE subscriptions DROP COLUMN IF EXISTS sessions_remaining;

-- Add a comment explaining the change
COMMENT ON TABLE subscriptions IS 'Subscriptions table - session tracking is now handled by subscription_group_sessions table';

-- Remove max_sessions column from plans table
-- This field is now obsolete as session tracking is handled by subscription_group_sessions table
-- The total sessions for a plan is calculated by summing session_count from plan_groups

-- Remove the column
ALTER TABLE plans DROP COLUMN IF EXISTS max_sessions;

-- Add a comment explaining the change
COMMENT ON TABLE plans IS 'Plans table - session tracking is now handled by plan_groups and subscription_group_sessions tables. Total sessions = sum of plan_groups.session_count';

-- Add 'refunded' to payment status constraint
-- This allows for refunded payments in the system

-- Drop the existing constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;

-- Add the updated constraint with 'refunded' status
ALTER TABLE payments ADD CONSTRAINT payments_status_check 
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded'));

-- Update the comment to reflect the new status values
COMMENT ON COLUMN payments.payment_status IS 'Payment status: pending (awaiting confirmation), paid (confirmed payment), failed (payment failed), cancelled (payment cancelled), refunded (payment refunded)';