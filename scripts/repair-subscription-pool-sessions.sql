-- =============================================================================
-- PRODUCTION: repair ALL subscription pool/group balances
-- Run in Supabase SQL editor (prod project: dwfhzfjcbxrekdxldgis)
--
-- Prerequisite: migration 20260829230800 applied (reconcile_subscription_sessions exists)
-- =============================================================================

-- Optional: see broken subs BEFORE repair (full pools = 0 used but has registrations)
SELECT
    s.id AS subscription_id,
    s.status,
    s.plan_id,
    COUNT(cr.id) AS registration_count,
    COALESCE(SUM(sps.total_sessions - sps.sessions_remaining), 0) AS pool_sessions_used
FROM subscriptions s
LEFT JOIN class_registrations cr
    ON cr.subscription_id = s.id
   AND (
        cr.status IN ('registered', 'attended', 'absent')
        OR (
            cr.status = 'cancelled'
            AND COALESCE(cr.notes, '') NOT ILIKE '%session refunded%'
        )
   )
LEFT JOIN subscription_pool_sessions sps ON sps.subscription_id = s.id
GROUP BY s.id, s.status, s.plan_id
HAVING COUNT(cr.id) > 0
   AND COALESCE(SUM(sps.total_sessions - sps.sessions_remaining), 0) = 0
ORDER BY s.id;

-- =============================================================================
-- FIX EVERYTHING — pick ONE:
-- =============================================================================

-- A) If reconcile_all_subscription_sessions exists (after migration 20260830172142):
SELECT reconcile_all_subscription_sessions(TRUE);

-- B) Otherwise loop inline (works with only reconcile_subscription_sessions):
DO $$
DECLARE
    r RECORD;
    v_result JSON;
    v_ok INTEGER := 0;
    v_fail INTEGER := 0;
BEGIN
    FOR r IN SELECT id FROM subscriptions ORDER BY id LOOP
        BEGIN
            v_result := reconcile_subscription_sessions(r.id, TRUE);
            IF COALESCE((v_result->>'success')::BOOLEAN, FALSE) THEN
                v_ok := v_ok + 1;
            ELSE
                v_fail := v_fail + 1;
                RAISE WARNING 'sub % failed: %', r.id, v_result;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_fail := v_fail + 1;
            RAISE WARNING 'sub % exception: %', r.id, SQLERRM;
        END;
    END LOOP;
    RAISE NOTICE 'done: % ok, % failed', v_ok, v_fail;
END;
$$;

-- =============================================================================
-- Verify: subs with registrations should show used > 0 where expected
-- =============================================================================
SELECT
    s.id AS subscription_id,
    sps.pool_id,
    sps.total_sessions,
    sps.sessions_remaining,
    sps.total_sessions - sps.sessions_remaining AS used
FROM subscriptions s
JOIN subscription_pool_sessions sps ON sps.subscription_id = s.id
WHERE EXISTS (
    SELECT 1 FROM class_registrations cr
    WHERE cr.subscription_id = s.id
      AND cr.status IN ('registered', 'attended', 'absent')
)
ORDER BY s.id, sps.pool_id;
