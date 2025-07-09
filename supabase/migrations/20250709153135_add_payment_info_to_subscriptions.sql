-- Add payment info fields to subscriptions
ALTER TABLE subscriptions
  ADD COLUMN payment_status TEXT,
  ADD COLUMN payment_type TEXT,
  ADD COLUMN transaction_id TEXT,
  ADD COLUMN amount_paid DECIMAL(10,2),
  ADD COLUMN payment_date DATE,
  ADD COLUMN due_date DATE,
  ADD COLUMN discount DECIMAL(10,2),
  ADD COLUMN payment_notes TEXT;

-- Down migration (optional):
-- ALTER TABLE subscriptions
--   DROP COLUMN payment_type,
--   DROP COLUMN transaction_id,
--   DROP COLUMN amount_paid,
--   DROP COLUMN payment_date,
--   DROP COLUMN due_date,
--   DROP COLUMN discount,
--   DROP COLUMN payment_notes;
