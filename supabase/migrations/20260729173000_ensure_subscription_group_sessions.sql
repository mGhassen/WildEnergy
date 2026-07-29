-- Ensure subscription_group_sessions rows exist for every plan group.
-- Existing subscriptions created before plan groups (or never initialized) were
-- missing rows; the UI then treated remaining as 0 while falling back to the
-- plan session_count for total, which looked like "all sessions used".

-- Safe initialize: never overwrite existing remaining balances
CREATE OR REPLACE FUNCTION initialize_subscription_group_sessions(
    p_subscription_id INTEGER,
    p_plan_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    plan_group RECORD;
BEGIN
    FOR plan_group IN
        SELECT pg.group_id, pg.session_count
        FROM plan_groups pg
        WHERE pg.plan_id = p_plan_id
    LOOP
        INSERT INTO subscription_group_sessions (
            subscription_id,
            group_id,
            sessions_remaining,
            total_sessions
        ) VALUES (
            p_subscription_id,
            plan_group.group_id,
            plan_group.session_count,
            plan_group.session_count
        )
        ON CONFLICT (subscription_id, group_id) DO NOTHING;
    END LOOP;
END;
$$;

-- Insert only missing group-session rows for a subscription's current plan.
-- Remaining = plan session_count minus sessions already consumed via registrations
-- for that group (so historical class usage is respected).
CREATE OR REPLACE FUNCTION ensure_subscription_group_sessions(
    p_subscription_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_plan_id INTEGER;
    plan_group RECORD;
    v_consumed INTEGER;
    v_remaining INTEGER;
BEGIN
    SELECT plan_id INTO v_plan_id
    FROM subscriptions
    WHERE id = p_subscription_id;

    IF v_plan_id IS NULL THEN
        RETURN;
    END IF;

    FOR plan_group IN
        SELECT pg.group_id, pg.session_count
        FROM plan_groups pg
        WHERE pg.plan_id = v_plan_id
    LOOP
        IF EXISTS (
            SELECT 1
            FROM subscription_group_sessions sgs
            WHERE sgs.subscription_id = p_subscription_id
              AND sgs.group_id = plan_group.group_id
        ) THEN
            CONTINUE;
        END IF;

        SELECT COUNT(*)::INTEGER INTO v_consumed
        FROM class_registrations cr
        JOIN courses c ON c.id = cr.course_id
        JOIN classes cl ON cl.id = c.class_id
        JOIN category_groups cg ON cg.category_id = cl.category_id
        WHERE cr.subscription_id = p_subscription_id
          AND cg.group_id = plan_group.group_id
          AND (
            cr.status IN ('registered', 'attended', 'absent')
            OR (
              cr.status = 'cancelled'
              AND COALESCE(cr.notes, '') NOT ILIKE '%session refunded%'
            )
          );

        v_remaining := GREATEST(plan_group.session_count - COALESCE(v_consumed, 0), 0);

        INSERT INTO subscription_group_sessions (
            subscription_id,
            group_id,
            sessions_remaining,
            total_sessions
        ) VALUES (
            p_subscription_id,
            plan_group.group_id,
            v_remaining,
            plan_group.session_count
        )
        ON CONFLICT (subscription_id, group_id) DO NOTHING;
    END LOOP;
END;
$$;

-- Backfill every subscription that is missing group-session rows
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM subscriptions LOOP
        PERFORM ensure_subscription_group_sessions(r.id);
    END LOOP;
END $$;

COMMENT ON FUNCTION ensure_subscription_group_sessions(INTEGER) IS
  'Creates missing subscription_group_sessions rows from the subscription plan groups. Remaining is reduced by existing non-refunded registrations for that group. Never overwrites existing rows.';
