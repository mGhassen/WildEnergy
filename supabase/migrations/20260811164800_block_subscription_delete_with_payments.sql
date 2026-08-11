-- Prevent deleting a subscription while payments still reference it.
-- App deletes must clean payments first (payment delete reverses credit ledger).

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT tc.constraint_name
  INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.table_schema = tc.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'payments'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'subscription_id'
    AND ccu.table_name = 'subscriptions'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE payments
  ADD CONSTRAINT payments_subscription_id_fkey
  FOREIGN KEY (subscription_id)
  REFERENCES subscriptions(id)
  ON DELETE RESTRICT;
