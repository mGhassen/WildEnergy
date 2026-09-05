-- Plan-level free flag (distinct from pool/group is_free session buckets)
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN plans.is_free IS 'Whether this plan is free (no payment required)';

-- Existing zero-price plans are free
UPDATE plans
SET is_free = true
WHERE price = 0
  AND is_free = false;

-- Activate stuck pending subscriptions on free plans (inclusive end date)
UPDATE subscriptions s
SET status = 'active',
    updated_at = NOW()
FROM plans p
WHERE s.plan_id = p.id
  AND (p.is_free = true OR p.price = 0)
  AND s.status = 'pending'
  AND s.end_date::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis')::date;
