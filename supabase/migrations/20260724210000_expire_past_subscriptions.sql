-- Mark subscriptions past their inclusive end date as expired.
-- Inclusive: valid through end_date calendar day (Africa/Tunis).
-- Only transitions active/pending → expired; leaves cancelled alone.

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

-- One-time backfill for rows already past end_date
SELECT expire_past_subscriptions();
