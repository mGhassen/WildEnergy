-- Close subscriptions when all sessions are consumed (status = completed).
-- Reopen to active when a refund restores remaining sessions.

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'completed'));

COMMENT ON COLUMN subscriptions.status IS
  'Subscription status: pending (awaiting payment), active (paid and active), cancelled (manually cancelled), expired (past end date), completed (all sessions consumed)';

CREATE OR REPLACE FUNCTION subscription_sessions_remaining_total(p_subscription_id INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE((
      SELECT SUM(sgs.sessions_remaining)
      FROM subscription_group_sessions sgs
      WHERE sgs.subscription_id = p_subscription_id
    ), 0)::INTEGER
    +
    COALESCE((
      SELECT SUM(sps.sessions_remaining)
      FROM subscription_pool_sessions sps
      WHERE sps.subscription_id = p_subscription_id
    ), 0)::INTEGER;
$$;

CREATE OR REPLACE FUNCTION complete_subscription_if_depleted(p_subscription_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE subscriptions
  SET status = 'completed',
      updated_at = NOW()
  WHERE id = p_subscription_id
    AND status IN ('active', 'pending')
    AND subscription_sessions_remaining_total(p_subscription_id) = 0;
END;
$$;

CREATE OR REPLACE FUNCTION reactivate_subscription_if_completed(p_subscription_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE subscriptions
  SET status = 'active',
      updated_at = NOW()
  WHERE id = p_subscription_id
    AND status = 'completed'
    AND subscription_sessions_remaining_total(p_subscription_id) > 0;
END;
$$;

CREATE OR REPLACE FUNCTION deduct_group_session(
    p_user_id UUID,
    p_course_id INTEGER,
    p_subscription_id INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_subscription_id INTEGER;
    v_course_date DATE;
    v_alloc RECORD;
    v_sessions_remaining INTEGER;
BEGIN
    SELECT c.course_date INTO v_course_date
    FROM courses c
    WHERE c.id = p_course_id;

    IF v_course_date IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Course not found'
        );
    END IF;

    IF p_subscription_id IS NOT NULL THEN
        SELECT s.id INTO v_subscription_id
        FROM subscriptions s
        WHERE s.id = p_subscription_id
          AND s.member_id = p_user_id
          AND COALESCE(s.status, '') NOT IN ('cancelled', 'completed')
          AND s.start_date::date <= v_course_date
          AND s.end_date::date >= v_course_date;
    ELSE
        SELECT s.id INTO v_subscription_id
        FROM subscriptions s
        WHERE s.member_id = p_user_id
          AND COALESCE(s.status, '') NOT IN ('cancelled', 'completed')
          AND s.start_date::date <= v_course_date
          AND s.end_date::date >= v_course_date
        ORDER BY s.end_date DESC
        LIMIT 1;
    END IF;

    IF v_subscription_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No subscription covering this course date'
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

    PERFORM complete_subscription_if_depleted(v_subscription_id);

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

CREATE OR REPLACE FUNCTION can_register_for_course(
    p_user_id UUID,
    p_course_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_subscription_id INTEGER;
    v_course_date DATE;
    v_alloc RECORD;
BEGIN
    SELECT c.course_date INTO v_course_date
    FROM courses c
    WHERE c.id = p_course_id;

    IF v_course_date IS NULL THEN
        RETURN json_build_object(
            'can_register', false,
            'error', 'Course not found'
        );
    END IF;

    SELECT s.id INTO v_subscription_id
    FROM subscriptions s
    WHERE s.member_id = p_user_id
      AND COALESCE(s.status, '') NOT IN ('cancelled', 'completed')
      AND s.start_date::date <= v_course_date
      AND s.end_date::date >= v_course_date
    ORDER BY s.end_date DESC
    LIMIT 1;

    IF v_subscription_id IS NULL THEN
        RETURN json_build_object(
            'can_register', false,
            'error', 'No subscription covering this course date'
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
            'subscription_id', v_subscription_id
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

CREATE OR REPLACE FUNCTION refund_group_session(
    p_user_id UUID,
    p_course_id INTEGER,
    p_subscription_id INTEGER DEFAULT NULL,
    p_session_source TEXT DEFAULT NULL,
    p_group_id INTEGER DEFAULT NULL,
    p_pool_id INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_subscription_id INTEGER;
    v_alloc RECORD;
    v_sessions_remaining INTEGER;
    v_total_sessions INTEGER;
    v_source_type TEXT;
    v_group_id INTEGER;
    v_pool_id INTEGER;
    v_balance_id INTEGER;
BEGIN
    IF p_subscription_id IS NOT NULL THEN
        SELECT s.id INTO v_subscription_id
        FROM subscriptions s
        WHERE s.id = p_subscription_id
          AND s.member_id = p_user_id;
    ELSE
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
              AND s.status IN ('active', 'completed')
              AND s.end_date::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis')::date
            ORDER BY s.end_date DESC
            LIMIT 1;
        END IF;
    END IF;

    IF v_subscription_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No subscription found'
        );
    END IF;

    IF p_session_source = 'dedicated' AND p_group_id IS NOT NULL THEN
        SELECT sgs.id, sgs.sessions_remaining, sgs.total_sessions, sgs.group_id
          INTO v_balance_id, v_sessions_remaining, v_total_sessions, v_group_id
        FROM subscription_group_sessions sgs
        WHERE sgs.subscription_id = v_subscription_id
          AND sgs.group_id = p_group_id;

        IF v_balance_id IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Tagged dedicated balance not found for refund'
            );
        END IF;

        IF v_sessions_remaining >= v_total_sessions THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Dedicated balance already at capacity — refund would be a no-op',
                'subscription_id', v_subscription_id,
                'group_id', v_group_id,
                'source_type', 'dedicated',
                'sessions_remaining', v_sessions_remaining
            );
        END IF;

        UPDATE subscription_group_sessions
        SET sessions_remaining = sessions_remaining + 1,
            updated_at = NOW()
        WHERE id = v_balance_id
        RETURNING sessions_remaining INTO v_sessions_remaining;

        PERFORM reactivate_subscription_if_completed(v_subscription_id);

        RETURN json_build_object(
            'success', true,
            'subscription_id', v_subscription_id,
            'group_id', v_group_id,
            'pool_id', NULL,
            'source_type', 'dedicated',
            'sessions_remaining', v_sessions_remaining
        );
    END IF;

    IF p_session_source = 'pool' AND p_pool_id IS NOT NULL THEN
        SELECT sps.id, sps.sessions_remaining, sps.total_sessions, sps.pool_id
          INTO v_balance_id, v_sessions_remaining, v_total_sessions, v_pool_id
        FROM subscription_pool_sessions sps
        WHERE sps.subscription_id = v_subscription_id
          AND sps.pool_id = p_pool_id;

        IF v_balance_id IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Tagged pool balance not found for refund'
            );
        END IF;

        IF v_sessions_remaining >= v_total_sessions THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Pool balance already at capacity — refund would be a no-op',
                'subscription_id', v_subscription_id,
                'pool_id', v_pool_id,
                'source_type', 'pool',
                'sessions_remaining', v_sessions_remaining
            );
        END IF;

        UPDATE subscription_pool_sessions
        SET sessions_remaining = sessions_remaining + 1,
            updated_at = NOW()
        WHERE id = v_balance_id
        RETURNING sessions_remaining INTO v_sessions_remaining;

        PERFORM reactivate_subscription_if_completed(v_subscription_id);

        RETURN json_build_object(
            'success', true,
            'subscription_id', v_subscription_id,
            'group_id', p_group_id,
            'pool_id', v_pool_id,
            'source_type', 'pool',
            'sessions_remaining', v_sessions_remaining
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

    v_source_type := v_alloc.source_type;
    v_group_id := v_alloc.group_id;
    v_pool_id := v_alloc.pool_id;

    IF v_source_type = 'dedicated' THEN
        SELECT sessions_remaining, total_sessions
          INTO v_sessions_remaining, v_total_sessions
        FROM subscription_group_sessions
        WHERE id = v_alloc.balance_id;

        IF v_sessions_remaining >= v_total_sessions THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Dedicated balance already at capacity — refund would be a no-op',
                'subscription_id', v_subscription_id,
                'group_id', v_group_id,
                'source_type', 'dedicated',
                'sessions_remaining', v_sessions_remaining
            );
        END IF;

        UPDATE subscription_group_sessions
        SET sessions_remaining = sessions_remaining + 1,
            updated_at = NOW()
        WHERE id = v_alloc.balance_id
        RETURNING sessions_remaining INTO v_sessions_remaining;
    ELSE
        SELECT sessions_remaining, total_sessions
          INTO v_sessions_remaining, v_total_sessions
        FROM subscription_pool_sessions
        WHERE id = v_alloc.balance_id;

        IF v_sessions_remaining >= v_total_sessions THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Pool balance already at capacity — refund would be a no-op',
                'subscription_id', v_subscription_id,
                'pool_id', v_pool_id,
                'source_type', 'pool',
                'sessions_remaining', v_sessions_remaining
            );
        END IF;

        UPDATE subscription_pool_sessions
        SET sessions_remaining = sessions_remaining + 1,
            updated_at = NOW()
        WHERE id = v_alloc.balance_id
        RETURNING sessions_remaining INTO v_sessions_remaining;
    END IF;

    PERFORM reactivate_subscription_if_completed(v_subscription_id);

    RETURN json_build_object(
        'success', true,
        'subscription_id', v_subscription_id,
        'group_id', v_group_id,
        'pool_id', v_pool_id,
        'source_type', v_source_type,
        'sessions_remaining', v_sessions_remaining
    );
END;
$$;

COMMENT ON FUNCTION refund_group_session(UUID, INTEGER, INTEGER, TEXT, INTEGER, INTEGER) IS
  'Credits a session back. Prefer registration session_source/group_id/pool_id tags; fall back to resolve_session_allocation. Fails if target balance is already at capacity. Reactivates completed subscriptions when remaining sessions > 0.';

-- Backfill: close already-depleted active/pending subscriptions
UPDATE subscriptions s
SET status = 'completed',
    updated_at = NOW()
WHERE s.status IN ('active', 'pending')
  AND subscription_sessions_remaining_total(s.id) = 0;
