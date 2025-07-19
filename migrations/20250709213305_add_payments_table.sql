-- Create payments table to separate payment data from subscriptions
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_type TEXT NOT NULL DEFAULT 'cash',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    transaction_id TEXT,
    payment_date DATE,
    due_date DATE,
    discount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);

-- Migrate existing payment data from subscriptions to payments table
INSERT INTO payments (
    subscription_id,
    user_id,
    amount,
    payment_type,
    payment_status,
    transaction_id,
    payment_date,
    due_date,
    discount,
    notes
)
SELECT 
    id as subscription_id,
    user_id,
    amount_paid,
    COALESCE(payment_type, 'cash'),
    COALESCE(payment_status, 'pending'),
    transaction_id,
    payment_date,
    due_date,
    COALESCE(discount, 0),
    payment_notes
FROM subscriptions 
WHERE amount_paid IS NOT NULL OR payment_type IS NOT NULL;

-- Remove payment-related columns from subscriptions table
ALTER TABLE subscriptions 
    DROP COLUMN IF EXISTS payment_status,
    DROP COLUMN IF EXISTS payment_type,
    DROP COLUMN IF EXISTS transaction_id,
    DROP COLUMN IF EXISTS amount_paid,
    DROP COLUMN IF EXISTS payment_date,
    DROP COLUMN IF EXISTS due_date,
    DROP COLUMN IF EXISTS discount,
    DROP COLUMN IF EXISTS payment_notes;

-- Add comment to explain the table purpose
COMMENT ON TABLE payments IS 'Payment records linked to subscriptions. Multiple payments can be made for a single subscription.'; 