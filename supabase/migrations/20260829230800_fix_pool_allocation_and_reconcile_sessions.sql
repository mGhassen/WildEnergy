-- Production fixes:
-- 1) Overlapping pools (e.g. Stretching in 10-pack + 2 free) — prefer free, then narrowest pool.
-- 2) ensure_* must not double-count one registration against every matching pool.
-- 3) reconcile_subscription_sessions replays registrations chronologically to rebuild balances.

CREATE OR REPLACE FUNCTION resolve_session_allocation(
    p_subscription_id INTEGER,
    p_course_id INTEGER,
    p_require_remaining BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    source_type TEXT,
    balance_id INTEGER,
    group_id INTEGER,
    pool_id INTEGER,
    sessions_remaining INTEGER,
    is_free BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_plan_id INTEGER;
BEGIN
    SELECT s.plan_id INTO v_plan_id
    FROM subscriptions s
    WHERE s.id = p_subscription_id;

    IF v_plan_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH candidate_groups AS (
        SELECT g.id AS gid
        FROM courses c
        JOIN classes cl ON c.class_id = cl.id
        JOIN category_groups cg ON cl.category_id = cg.category_id
        JOIN groups g ON cg.group_id = g.id
        WHERE c.id = p_course_id
          AND lower(trim(g.name)) = lower(trim(cl.name))
    ),
    dedicated AS (
        SELECT
            'dedicated'::TEXT AS stype,
            sgs.id AS bid,
            sgs.group_id AS gid,
            NULL::INTEGER AS pid,
            sgs.sessions_remaining AS rem,
            COALESCE(pg.is_free, FALSE) AS free,
            0 AS pool_group_count
        FROM subscription_group_sessions sgs
        JOIN candidate_groups cg ON cg.gid = sgs.group_id
        LEFT JOIN plan_groups pg
          ON pg.plan_id = v_plan_id AND pg.group_id = sgs.group_id
        WHERE sgs.subscription_id = p_subscription_id
          AND (NOT p_require_remaining OR sgs.sessions_remaining > 0)
    ),
    pooled AS (
        SELECT DISTINCT ON (sps.id)
            'pool'::TEXT AS stype,
            sps.id AS bid,
            pspg.group_id AS gid,
            sps.pool_id AS pid,
            sps.sessions_remaining AS rem,
            COALESCE(psp.is_free, FALSE) AS free,
            (
                SELECT COUNT(*)::INTEGER
                FROM plan_session_pool_groups pspg2
                WHERE pspg2.pool_id = sps.pool_id
            ) AS pool_group_count
        FROM subscription_pool_sessions sps
        JOIN plan_session_pools psp ON psp.id = sps.pool_id
        JOIN plan_session_pool_groups pspg ON pspg.pool_id = sps.pool_id
        JOIN candidate_groups cg ON cg.gid = pspg.group_id
        WHERE sps.subscription_id = p_subscription_id
          AND (NOT p_require_remaining OR sps.sessions_remaining > 0)
        ORDER BY sps.id, pspg.group_id
    ),
    targets AS (
        SELECT * FROM dedicated
        UNION ALL
        SELECT * FROM pooled
    )
    SELECT t.stype, t.bid, t.gid, t.pid, t.rem, t.free
    FROM targets t
    ORDER BY
        t.free DESC,
        CASE WHEN t.stype = 'dedicated' THEN 0 ELSE 1 END,
        t.pool_group_count ASC,
        t.bid
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION resolve_session_allocation(INTEGER, INTEGER, BOOLEAN) IS
  'Picks balance for a course. Free pools first, then dedicated, then narrowest matching pool (fewest groups), then balance id.';

-- ---------------------------------------------------------------------------
-- ensure_*: only count registrations already tagged with this pool_id
-- (reconcile_subscription_sessions is responsible for rebuilding balances).
-- ---------------------------------------------------------------------------

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

    DELETE FROM subscription_group_sessions sgs
    WHERE sgs.subscription_id = p_subscription_id
      AND NOT EXISTS (
        SELECT 1
        FROM plan_groups pg
        WHERE pg.plan_id = v_plan_id
          AND pg.group_id = sgs.group_id
      );

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
        WHERE cr.subscription_id = p_subscription_id
          AND cr.session_source = 'dedicated'
          AND cr.group_id = plan_group.group_id
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
        WHERE cr.subscription_id = p_subscription_id
          AND cr.session_source = 'pool'
          AND cr.pool_id = plan_pool.pool_id
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
  'Prunes orphaned balances and inserts missing rows. Never overwrites existing remaining. New pool rows count only registrations already tagged with pool_id.';

-- ---------------------------------------------------------------------------
-- Replay registrations in chronological order against current plan balances.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION pick_allocation_from_sim(
    p_subscription_id INTEGER,
    p_course_id INTEGER,
    p_group_remaining JSONB,
    p_pool_remaining JSONB
)
RETURNS TABLE (
    source_type TEXT,
    group_id INTEGER,
    pool_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_plan_id INTEGER;
BEGIN
    SELECT s.plan_id INTO v_plan_id
    FROM subscriptions s
    WHERE s.id = p_subscription_id;

    IF v_plan_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH candidate_groups AS (
        SELECT g.id AS gid
        FROM courses c
        JOIN classes cl ON c.class_id = cl.id
        JOIN category_groups cg ON cl.category_id = cg.category_id
        JOIN groups g ON cg.group_id = g.id
        WHERE c.id = p_course_id
          AND lower(trim(g.name)) = lower(trim(cl.name))
    ),
    dedicated AS (
        SELECT
            'dedicated'::TEXT AS stype,
            sgs.group_id AS gid,
            NULL::INTEGER AS pid,
            COALESCE(pg.is_free, FALSE) AS free,
            0 AS pool_group_count
        FROM subscription_group_sessions sgs
        JOIN candidate_groups cg ON cg.gid = sgs.group_id
        LEFT JOIN plan_groups pg
          ON pg.plan_id = v_plan_id AND pg.group_id = sgs.group_id
        WHERE sgs.subscription_id = p_subscription_id
          AND COALESCE((p_group_remaining->>sgs.group_id::TEXT)::INTEGER, 0) > 0
    ),
    pooled AS (
        SELECT DISTINCT ON (sps.pool_id)
            'pool'::TEXT AS stype,
            pspg.group_id AS gid,
            sps.pool_id AS pid,
            COALESCE(psp.is_free, FALSE) AS free,
            (
                SELECT COUNT(*)::INTEGER
                FROM plan_session_pool_groups pspg2
                WHERE pspg2.pool_id = sps.pool_id
            ) AS pool_group_count
        FROM subscription_pool_sessions sps
        JOIN plan_session_pools psp ON psp.id = sps.pool_id
        JOIN plan_session_pool_groups pspg ON pspg.pool_id = sps.pool_id
        JOIN candidate_groups cg ON cg.gid = pspg.group_id
        WHERE sps.subscription_id = p_subscription_id
          AND COALESCE((p_pool_remaining->>sps.pool_id::TEXT)::INTEGER, 0) > 0
        ORDER BY sps.pool_id, pspg.group_id
    ),
    targets AS (
        SELECT * FROM dedicated
        UNION ALL
        SELECT * FROM pooled
    )
    SELECT t.stype, t.gid, t.pid
    FROM targets t
    ORDER BY
        t.free DESC,
        CASE WHEN t.stype = 'dedicated' THEN 0 ELSE 1 END,
        t.pool_group_count ASC,
        t.gid,
        t.pid
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION reconcile_subscription_sessions(
    p_subscription_id INTEGER,
    p_fix_registrations BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_plan_id INTEGER;
    v_reg RECORD;
    v_alloc RECORD;
    v_group_remaining JSONB := '{}'::JSONB;
    v_pool_remaining JSONB := '{}'::JSONB;
    v_group_totals JSONB := '{}'::JSONB;
    v_pool_totals JSONB := '{}'::JSONB;
    v_regs_replayed INTEGER := 0;
    v_regs_retagged INTEGER := 0;
    v_regs_skipped INTEGER := 0;
    v_before JSONB;
    v_after JSONB;
    v_key TEXT;
    v_val INTEGER;
    v_warnings JSONB := '[]'::JSONB;
BEGIN
    SELECT plan_id INTO v_plan_id
    FROM subscriptions
    WHERE id = p_subscription_id;

    IF v_plan_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Subscription not found'
        );
    END IF;

    PERFORM ensure_subscription_group_sessions(p_subscription_id);

    SELECT jsonb_object_agg(sgs.group_id::TEXT, sgs.sessions_remaining)
      INTO v_before
    FROM subscription_group_sessions sgs
    WHERE sgs.subscription_id = p_subscription_id;

    SELECT COALESCE(
        (
            SELECT jsonb_object_agg(sps.pool_id::TEXT, sps.sessions_remaining)
            FROM subscription_pool_sessions sps
            WHERE sps.subscription_id = p_subscription_id
        ),
        '{}'::JSONB
    ) || COALESCE(v_before, '{}'::JSONB)
    INTO v_before;

    FOR v_key, v_val IN
        SELECT sgs.group_id::TEXT, sgs.total_sessions
        FROM subscription_group_sessions sgs
        WHERE sgs.subscription_id = p_subscription_id
    LOOP
        v_group_totals := jsonb_set(v_group_totals, ARRAY[v_key], to_jsonb(v_val), true);
        v_group_remaining := jsonb_set(v_group_remaining, ARRAY[v_key], to_jsonb(v_val), true);
    END LOOP;

    FOR v_key, v_val IN
        SELECT sps.pool_id::TEXT, sps.total_sessions
        FROM subscription_pool_sessions sps
        WHERE sps.subscription_id = p_subscription_id
    LOOP
        v_pool_totals := jsonb_set(v_pool_totals, ARRAY[v_key], to_jsonb(v_val), true);
        v_pool_remaining := jsonb_set(v_pool_remaining, ARRAY[v_key], to_jsonb(v_val), true);
    END LOOP;

    FOR v_reg IN
        SELECT cr.id, cr.course_id, cr.pool_id, cr.group_id, cr.session_source, cr.status, cr.notes
        FROM class_registrations cr
        WHERE cr.subscription_id = p_subscription_id
          AND (
            cr.status IN ('registered', 'attended', 'absent')
            OR (
              cr.status = 'cancelled'
              AND COALESCE(cr.notes, '') NOT ILIKE '%session refunded%'
            )
          )
        ORDER BY cr.registration_date ASC NULLS LAST, cr.id ASC
    LOOP
        v_regs_replayed := v_regs_replayed + 1;

        SELECT * INTO v_alloc
        FROM pick_allocation_from_sim(
            p_subscription_id,
            v_reg.course_id,
            v_group_remaining,
            v_pool_remaining
        );

        IF v_alloc IS NULL OR v_alloc.source_type IS NULL THEN
            v_regs_skipped := v_regs_skipped + 1;
            v_warnings := v_warnings || jsonb_build_array(
                jsonb_build_object(
                    'registration_id', v_reg.id,
                    'course_id', v_reg.course_id,
                    'warning', 'No simulated balance available — registration not replayed'
                )
            );
            CONTINUE;
        END IF;

        IF v_alloc.source_type = 'dedicated' THEN
            v_key := v_alloc.group_id::TEXT;
            v_val := COALESCE((v_group_remaining->>v_key)::INTEGER, 0) - 1;
            v_group_remaining := jsonb_set(v_group_remaining, ARRAY[v_key], to_jsonb(GREATEST(v_val, 0)), true);
        ELSE
            v_key := v_alloc.pool_id::TEXT;
            v_val := COALESCE((v_pool_remaining->>v_key)::INTEGER, 0) - 1;
            v_pool_remaining := jsonb_set(v_pool_remaining, ARRAY[v_key], to_jsonb(GREATEST(v_val, 0)), true);
        END IF;

        IF p_fix_registrations THEN
            IF v_reg.session_source IS DISTINCT FROM v_alloc.source_type
               OR v_reg.group_id IS DISTINCT FROM v_alloc.group_id
               OR v_reg.pool_id IS DISTINCT FROM v_alloc.pool_id THEN
                v_regs_retagged := v_regs_retagged + 1;
            END IF;

            UPDATE class_registrations
            SET session_source = v_alloc.source_type,
                group_id = v_alloc.group_id,
                pool_id = v_alloc.pool_id
            WHERE id = v_reg.id;
        END IF;
    END LOOP;

    IF p_fix_registrations THEN
        UPDATE subscription_group_sessions sgs
        SET sessions_remaining = COALESCE((v_group_remaining->>sgs.group_id::TEXT)::INTEGER, 0),
            updated_at = NOW()
        WHERE sgs.subscription_id = p_subscription_id;

        UPDATE subscription_pool_sessions sps
        SET sessions_remaining = COALESCE((v_pool_remaining->>sps.pool_id::TEXT)::INTEGER, 0),
            updated_at = NOW()
        WHERE sps.subscription_id = p_subscription_id;
    END IF;

    SELECT COALESCE(
        (
            SELECT jsonb_object_agg(sps.pool_id::TEXT, sps.sessions_remaining)
            FROM subscription_pool_sessions sps
            WHERE sps.subscription_id = p_subscription_id
        ),
        '{}'::JSONB
    ) || COALESCE(
        (
            SELECT jsonb_object_agg(sgs.group_id::TEXT, sgs.sessions_remaining)
            FROM subscription_group_sessions sgs
            WHERE sgs.subscription_id = p_subscription_id
        ),
        '{}'::JSONB
    )
    INTO v_after;

    RETURN json_build_object(
        'success', true,
        'subscription_id', p_subscription_id,
        'plan_id', v_plan_id,
        'fix_registrations', p_fix_registrations,
        'registrations_replayed', v_regs_replayed,
        'registrations_retagged', v_regs_retagged,
        'registrations_skipped', v_regs_skipped,
        'remaining_before', v_before,
        'remaining_after_simulation', CASE
            WHEN p_fix_registrations THEN v_after
            ELSE v_pool_remaining || v_group_remaining
        END,
        'totals', v_pool_totals || v_group_totals,
        'warnings', v_warnings
    );
END;
$$;

COMMENT ON FUNCTION reconcile_subscription_sessions(INTEGER, BOOLEAN) IS
  'Replay consumed registrations chronologically against current plan pools/groups. p_fix_registrations=false previews; true updates class_registrations tags and subscription_*_sessions remaining.';
