-- Inclusive subscription end dates: end_date is the last valid calendar day.
-- Expires at midnight after end_date. 1-day: start=D, end=D.
-- Valid when start_date <= day <= end_date.

-- Convert exclusive rows (end = start + duration) back to inclusive (end = start + duration - 1).
UPDATE subscriptions s
SET
  end_date = s.end_date - INTERVAL '1 day',
  updated_at = NOW()
FROM plans p
WHERE p.id = s.plan_id
  AND p.duration_days >= 1
  AND (s.end_date::date - s.start_date::date) = p.duration_days;

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
          AND COALESCE(s.status, '') <> 'cancelled'
          AND s.start_date::date <= v_course_date
          AND s.end_date::date >= v_course_date;
    ELSE
        SELECT s.id INTO v_subscription_id
        FROM subscriptions s
        WHERE s.member_id = p_user_id
          AND COALESCE(s.status, '') <> 'cancelled'
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
      AND COALESCE(s.status, '') <> 'cancelled'
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
    p_subscription_id INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_subscription_id INTEGER;
    v_alloc RECORD;
    v_sessions_remaining INTEGER;
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
              AND s.status = 'active'
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
