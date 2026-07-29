-- Shared session pools (hybrid): N sessions usable across selected groups,
-- alongside existing per-group plan_groups / subscription_group_sessions.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE plan_session_pools (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    session_count INTEGER NOT NULL DEFAULT 1 CHECK (session_count >= 1),
    is_free BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plan_session_pools_plan_id ON plan_session_pools(plan_id);

CREATE OR REPLACE FUNCTION update_plan_session_pools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_plan_session_pools_updated_at
    BEFORE UPDATE ON plan_session_pools
    FOR EACH ROW
    EXECUTE FUNCTION update_plan_session_pools_updated_at();

COMMENT ON TABLE plan_session_pools IS
  'Shared session pools on a plan: session_count usable in any of the pool''s groups';

-- Membership: denormalized plan_id so a group cannot belong to two pools on the same plan
CREATE TABLE plan_session_pool_groups (
    id SERIAL PRIMARY KEY,
    pool_id INTEGER NOT NULL REFERENCES plan_session_pools(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT plan_session_pool_groups_pool_group_unique UNIQUE (pool_id, group_id),
    CONSTRAINT plan_session_pool_groups_plan_group_unique UNIQUE (plan_id, group_id)
);

CREATE INDEX idx_plan_session_pool_groups_pool_id ON plan_session_pool_groups(pool_id);
CREATE INDEX idx_plan_session_pool_groups_group_id ON plan_session_pool_groups(group_id);

COMMENT ON TABLE plan_session_pool_groups IS
  'Groups included in a shared session pool. UNIQUE(plan_id, group_id) prevents a group in multiple pools on one plan.';

-- Exclusive: group cannot be both dedicated (plan_groups) and in a pool on the same plan
CREATE OR REPLACE FUNCTION enforce_plan_group_allocation_exclusive()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_TABLE_NAME = 'plan_groups' THEN
        IF EXISTS (
            SELECT 1 FROM plan_session_pool_groups pspg
            WHERE pspg.plan_id = NEW.plan_id AND pspg.group_id = NEW.group_id
        ) THEN
            RAISE EXCEPTION 'Group % is already in a shared pool on plan %', NEW.group_id, NEW.plan_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'plan_session_pool_groups' THEN
        IF EXISTS (
            SELECT 1 FROM plan_groups pg
            WHERE pg.plan_id = NEW.plan_id AND pg.group_id = NEW.group_id
        ) THEN
            RAISE EXCEPTION 'Group % is already a dedicated plan group on plan %', NEW.group_id, NEW.plan_id;
        END IF;
        -- Keep plan_id aligned with the pool
        IF NOT EXISTS (
            SELECT 1 FROM plan_session_pools psp
            WHERE psp.id = NEW.pool_id AND psp.plan_id = NEW.plan_id
        ) THEN
            RAISE EXCEPTION 'plan_id % does not match pool %', NEW.plan_id, NEW.pool_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_plan_groups_exclusive
    BEFORE INSERT OR UPDATE ON plan_groups
    FOR EACH ROW
    EXECUTE FUNCTION enforce_plan_group_allocation_exclusive();

CREATE TRIGGER trigger_plan_session_pool_groups_exclusive
    BEFORE INSERT OR UPDATE ON plan_session_pool_groups
    FOR EACH ROW
    EXECUTE FUNCTION enforce_plan_group_allocation_exclusive();

CREATE TABLE subscription_pool_sessions (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    pool_id INTEGER NOT NULL REFERENCES plan_session_pools(id) ON DELETE CASCADE,
    sessions_remaining INTEGER NOT NULL DEFAULT 0,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT subscription_pool_sessions_unique UNIQUE (subscription_id, pool_id)
);

CREATE INDEX idx_subscription_pool_sessions_subscription_id ON subscription_pool_sessions(subscription_id);
CREATE INDEX idx_subscription_pool_sessions_pool_id ON subscription_pool_sessions(pool_id);

CREATE OR REPLACE FUNCTION update_subscription_pool_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_pool_sessions_updated_at
    BEFORE UPDATE ON subscription_pool_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_pool_sessions_updated_at();

COMMENT ON TABLE subscription_pool_sessions IS
  'Tracks remaining sessions per shared pool for each subscription';

-- ---------------------------------------------------------------------------
-- Initialize / ensure (dedicated + shared)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION initialize_subscription_group_sessions(
    p_subscription_id INTEGER,
    p_plan_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    plan_group RECORD;
    plan_pool RECORD;
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

    FOR plan_pool IN
        SELECT psp.id AS pool_id, psp.session_count
        FROM plan_session_pools psp
        WHERE psp.plan_id = p_plan_id
    LOOP
        INSERT INTO subscription_pool_sessions (
            subscription_id,
            pool_id,
            sessions_remaining,
            total_sessions
        ) VALUES (
            p_subscription_id,
            plan_pool.pool_id,
            plan_pool.session_count,
            plan_pool.session_count
        )
        ON CONFLICT (subscription_id, pool_id) DO NOTHING;
    END LOOP;
END;
$$;

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
  'Creates missing subscription_group_sessions and subscription_pool_sessions from the plan. Never overwrites existing rows.';

-- ---------------------------------------------------------------------------
-- Resolve allocation helper (dedicated + pool)
-- ---------------------------------------------------------------------------

-- Returns one row: source_type ('dedicated'|'pool'), balance_id, group_id, pool_id, sessions_remaining, is_free
-- p_require_remaining: when true, only balances with remaining > 0 (deduct/can_register);
--                      when false, any matching allocation (refund).

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
        SELECT DISTINCT g.id AS gid
        FROM courses c
        JOIN classes cl ON c.class_id = cl.id
        JOIN category_groups cg ON cl.category_id = cg.category_id
        JOIN groups g ON cg.group_id = g.id
        WHERE c.id = p_course_id
    ),
    dedicated AS (
        SELECT
            'dedicated'::TEXT AS stype,
            sgs.id AS bid,
            sgs.group_id AS gid,
            NULL::INTEGER AS pid,
            sgs.sessions_remaining AS rem,
            COALESCE(pg.is_free, FALSE) AS free
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
            COALESCE(psp.is_free, FALSE) AS free
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
        t.bid
    LIMIT 1;
END;
$$;

-- ---------------------------------------------------------------------------
-- can_register / deduct / refund (hybrid)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION can_register_for_course(
    p_user_id UUID,
    p_course_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_subscription_id INTEGER;
    v_alloc RECORD;
BEGIN
    SELECT s.id INTO v_subscription_id
    FROM subscriptions s
    WHERE s.member_id = p_user_id
      AND s.status = 'active'
      AND s.end_date::date > (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis')::date
    ORDER BY s.end_date DESC
    LIMIT 1;

    IF v_subscription_id IS NULL THEN
        RETURN json_build_object(
            'can_register', false,
            'error', 'No active subscription found'
        );
    END IF;

    SELECT * INTO v_alloc
    FROM resolve_session_allocation(v_subscription_id, p_course_id, TRUE);

    IF v_alloc IS NULL OR v_alloc.balance_id IS NULL THEN
        RETURN json_build_object(
            'can_register', false,
            'error', 'No sessions allocated for this course type'
        );
    END IF;

    IF v_alloc.sessions_remaining <= 0 THEN
        RETURN json_build_object(
            'can_register', false,
            'error', 'No remaining sessions for this course type',
            'group_id', v_alloc.group_id,
            'pool_id', v_alloc.pool_id,
            'source_type', v_alloc.source_type,
            'sessions_remaining', v_alloc.sessions_remaining
        );
    END IF;

    RETURN json_build_object(
        'can_register', true,
        'subscription_id', v_subscription_id,
        'group_id', v_alloc.group_id,
        'pool_id', v_alloc.pool_id,
        'source_type', v_alloc.source_type,
        'sessions_remaining', v_alloc.sessions_remaining
    );
END;
$$;

CREATE OR REPLACE FUNCTION deduct_group_session(
    p_user_id UUID,
    p_course_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_subscription_id INTEGER;
    v_alloc RECORD;
    v_sessions_remaining INTEGER;
BEGIN
    SELECT s.id INTO v_subscription_id
    FROM subscriptions s
    WHERE s.member_id = p_user_id
      AND s.status = 'active'
      AND s.end_date::date > (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis')::date
    ORDER BY s.end_date DESC
    LIMIT 1;

    IF v_subscription_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No active subscription found'
        );
    END IF;

    SELECT * INTO v_alloc
    FROM resolve_session_allocation(v_subscription_id, p_course_id, TRUE);

    IF v_alloc IS NULL OR v_alloc.balance_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No remaining sessions for this course type'
        );
    END IF;

    IF v_alloc.source_type = 'dedicated' THEN
        UPDATE subscription_group_sessions
        SET sessions_remaining = sessions_remaining - 1,
            updated_at = NOW()
        WHERE id = v_alloc.balance_id
          AND sessions_remaining > 0
        RETURNING sessions_remaining INTO v_sessions_remaining;
    ELSE
        UPDATE subscription_pool_sessions
        SET sessions_remaining = sessions_remaining - 1,
            updated_at = NOW()
        WHERE id = v_alloc.balance_id
          AND sessions_remaining > 0
        RETURNING sessions_remaining INTO v_sessions_remaining;
    END IF;

    IF v_sessions_remaining IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No remaining sessions for this course type'
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'subscription_id', v_subscription_id,
        'group_id', v_alloc.group_id,
        'pool_id', v_alloc.pool_id,
        'source_type', v_alloc.source_type,
        'sessions_remaining', v_sessions_remaining
    );
END;
$$;

CREATE OR REPLACE FUNCTION refund_group_session(
    p_user_id UUID,
    p_course_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_subscription_id INTEGER;
    v_alloc RECORD;
    v_sessions_remaining INTEGER;
BEGIN
    -- Prefer subscription linked to a recent registration for this course; fall back to active
    SELECT cr.subscription_id INTO v_subscription_id
    FROM class_registrations cr
    WHERE cr.member_id = p_user_id
      AND cr.course_id = p_course_id
      AND cr.subscription_id IS NOT NULL
    ORDER BY cr.registration_date DESC
    LIMIT 1;

    IF v_subscription_id IS NULL THEN
        SELECT s.id INTO v_subscription_id
        FROM subscriptions s
        WHERE s.member_id = p_user_id
          AND s.status = 'active'
          AND s.end_date::date > (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis')::date
        ORDER BY s.end_date DESC
        LIMIT 1;
    END IF;

    IF v_subscription_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No subscription found'
        );
    END IF;

    SELECT * INTO v_alloc
    FROM resolve_session_allocation(v_subscription_id, p_course_id, FALSE);

    IF v_alloc IS NULL OR v_alloc.balance_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No sessions allocated for this course type'
        );
    END IF;

    IF v_alloc.source_type = 'dedicated' THEN
        UPDATE subscription_group_sessions
        SET sessions_remaining = LEAST(sessions_remaining + 1, total_sessions),
            updated_at = NOW()
        WHERE id = v_alloc.balance_id
        RETURNING sessions_remaining INTO v_sessions_remaining;
    ELSE
        UPDATE subscription_pool_sessions
        SET sessions_remaining = LEAST(sessions_remaining + 1, total_sessions),
            updated_at = NOW()
        WHERE id = v_alloc.balance_id
        RETURNING sessions_remaining INTO v_sessions_remaining;
    END IF;

    RETURN json_build_object(
        'success', true,
        'subscription_id', v_subscription_id,
        'group_id', v_alloc.group_id,
        'pool_id', v_alloc.pool_id,
        'source_type', v_alloc.source_type,
        'sessions_remaining', v_sessions_remaining
    );
END;
$$;

-- Fix cancel: drop obsolete subscriptions.sessions_remaining update
CREATE OR REPLACE FUNCTION cancel_registration_with_updates(
  p_registration_id INTEGER,
  p_user_id UUID,
  p_is_within_24_hours BOOLEAN,
  p_subscription_id INTEGER DEFAULT NULL,
  p_force_refund BOOLEAN DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_course_id INTEGER;
  v_subscription_id INTEGER;
  v_current_participants INTEGER;
  v_result JSON;
  v_refund_session BOOLEAN;
BEGIN
  BEGIN
    SELECT course_id, subscription_id INTO v_course_id, v_subscription_id
    FROM class_registrations
    WHERE id = p_registration_id AND member_id = p_user_id AND status = 'registered';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Registration not found or not in registered status';
    END IF;

    IF p_subscription_id IS NOT NULL THEN
      v_subscription_id := p_subscription_id;
    END IF;

    SELECT current_participants INTO v_current_participants
    FROM courses
    WHERE id = v_course_id;

    IF p_force_refund IS NOT NULL THEN
      v_refund_session := p_force_refund;
    ELSE
      v_refund_session := NOT p_is_within_24_hours;
    END IF;

    UPDATE class_registrations
    SET status = 'cancelled',
        notes = CASE
          WHEN v_refund_session THEN 'Cancelled - session refunded'
          ELSE 'Cancelled within 24 hours - session forfeited'
        END
    WHERE id = p_registration_id;

    UPDATE courses
    SET current_participants = GREATEST(0, v_current_participants - 1),
        updated_at = NOW()
    WHERE id = v_course_id;

    IF v_refund_session THEN
      PERFORM refund_group_session(p_user_id, v_course_id);
    END IF;

    SELECT json_build_object(
      'success', true,
      'registration_id', p_registration_id,
      'course_id', v_course_id,
      'session_refunded', v_refund_session,
      'is_within_24_hours', p_is_within_24_hours
    ) INTO v_result;

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Cancellation failed: %', SQLERRM;
  END;
END;
$$;
