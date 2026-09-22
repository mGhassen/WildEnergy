-- Ensure past-end subscriptions are marked expired (inclusive end_date, Africa/Tunis).
-- Also prevent reactivating a completed subscription whose end_date has already passed.

CREATE OR REPLACE FUNCTION expire_past_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE subscriptions
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE status IN ('active', 'pending')
    AND end_date::date < (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis')::date;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

COMMENT ON FUNCTION expire_past_subscriptions() IS
  'Sets status to expired for active/pending subscriptions whose inclusive end_date is before today (Africa/Tunis).';

CREATE OR REPLACE FUNCTION reactivate_subscription_if_completed(p_subscription_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Past inclusive end → expired, not active
  UPDATE subscriptions
  SET status = 'expired',
      updated_at = NOW()
  WHERE id = p_subscription_id
    AND status = 'completed'
    AND subscription_sessions_remaining_total(p_subscription_id) > 0
    AND end_date::date < (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis')::date;

  UPDATE subscriptions
  SET status = 'active',
      updated_at = NOW()
  WHERE id = p_subscription_id
    AND status = 'completed'
    AND subscription_sessions_remaining_total(p_subscription_id) > 0
    AND end_date::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis')::date;
END;
$$;

-- One-time backfill for rows already past end_date
SELECT expire_past_subscriptions();
