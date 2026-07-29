-- Prune orphaned subscription session balances when plan allocations change.
-- ensure_* previously only inserted missing rows, so dedicated group balances
-- remained after groups were removed or converted to shared pools.

CREATE OR REPLACE FUNCTION ensure_subscription_group_sessions(
    p_subscription_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_plan_id INTEGER;
    plan_group RECORD;
    plan_pool RECORD;
    v_consumed INTEGER;
    v_remaining INTEGER;
BEGIN
    SELECT plan_id INTO v_plan_id
    FROM subscriptions
    WHERE id = p_subscription_id;

    IF v_plan_id IS NULL THEN
        RETURN;
    END IF;

    -- Drop dedicated balances for groups no longer on the plan
    DELETE FROM subscription_group_sessions sgs
    WHERE sgs.subscription_id = p_subscription_id
      AND NOT EXISTS (
        SELECT 1
        FROM plan_groups pg
        WHERE pg.plan_id = v_plan_id
          AND pg.group_id = sgs.group_id
      );

    -- Drop pool balances for pools no longer on the plan
    DELETE FROM subscription_pool_sessions sps
    WHERE sps.subscription_id = p_subscription_id
      AND NOT EXISTS (
        SELECT 1
        FROM plan_session_pools psp
        WHERE psp.plan_id = v_plan_id
          AND psp.id = sps.pool_id
      );

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

    FOR plan_pool IN
        SELECT psp.id AS pool_id, psp.session_count
        FROM plan_session_pools psp
        WHERE psp.plan_id = v_plan_id
    LOOP
        IF EXISTS (
            SELECT 1
            FROM subscription_pool_sessions sps
            WHERE sps.subscription_id = p_subscription_id
              AND sps.pool_id = plan_pool.pool_id
        ) THEN
            CONTINUE;
        END IF;

        SELECT COUNT(DISTINCT cr.id)::INTEGER INTO v_consumed
        FROM class_registrations cr
        JOIN courses c ON c.id = cr.course_id
        JOIN classes cl ON cl.id = c.class_id
        JOIN category_groups cg ON cg.category_id = cl.category_id
        JOIN plan_session_pool_groups pspg
          ON pspg.group_id = cg.group_id
         AND pspg.pool_id = plan_pool.pool_id
        WHERE cr.subscription_id = p_subscription_id
          AND (
            cr.status IN ('registered', 'attended', 'absent')
            OR (
              cr.status = 'cancelled'
              AND COALESCE(cr.notes, '') NOT ILIKE '%session refunded%'
            )
          );

        v_remaining := GREATEST(plan_pool.session_count - COALESCE(v_consumed, 0), 0);

        INSERT INTO subscription_pool_sessions (
            subscription_id,
            pool_id,
            sessions_remaining,
            total_sessions
        ) VALUES (
            p_subscription_id,
            plan_pool.pool_id,
            v_remaining,
            plan_pool.session_count
        )
        ON CONFLICT (subscription_id, pool_id) DO NOTHING;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION ensure_subscription_group_sessions(INTEGER) IS
  'Prunes orphaned group/pool session rows, then creates missing rows from the current plan. Never overwrites existing remaining balances.';

-- Backfill: clean orphans and ensure missing rows for every subscription
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM subscriptions LOOP
        PERFORM ensure_subscription_group_sessions(r.id);
    END LOOP;
END $$;
