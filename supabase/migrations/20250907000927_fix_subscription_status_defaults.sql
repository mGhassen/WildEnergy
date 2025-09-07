-- Fix subscription status defaults and add constraints
-- Subscriptions should start as 'pending' until payment is confirmed

-- Update the default value for status column
ALTER TABLE subscriptions ALTER COLUMN status SET DEFAULT 'pending';

-- Add check constraint to ensure only valid statuses are used
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check 
  CHECK (status IN ('pending', 'active', 'cancelled', 'expired'));

-- Update any existing 'active' subscriptions that don't have payments to 'pending'
-- This is a one-time fix for existing data
UPDATE subscriptions 
SET status = 'pending' 
WHERE id NOT IN (
  SELECT DISTINCT subscription_id 
  FROM payments 
  WHERE payment_status = 'paid' 
  AND subscription_id IS NOT NULL
);

-- Add a comment to document the status meanings
COMMENT ON COLUMN subscriptions.status IS 'Subscription status: pending (awaiting payment), active (paid and active), cancelled (manually cancelled), expired (past end date)';

-- Add check constraint for payment status as well
ALTER TABLE payments ADD CONSTRAINT payments_status_check 
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled'));

-- Add a comment to document the payment status meanings
COMMENT ON COLUMN payments.payment_status IS 'Payment status: pending (awaiting confirmation), paid (confirmed payment), failed (payment failed), cancelled (payment cancelled)';
