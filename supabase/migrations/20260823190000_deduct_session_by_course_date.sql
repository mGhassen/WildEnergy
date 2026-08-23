-- Deduct from the subscription that covered the course date (historical admin adds),
-- not whatever is "active today". Optional p_subscription_id wins when provided.

DROP FUNCTION IF EXISTS deduct_group_session(UUID, INTEGER);
DROP FUNCTION IF EXISTS deduct_group_session(UUID, INTEGER, INTEGER);

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
          AND s.end_date::date > v_course_date;
    ELSE
        SELECT s.id INTO v_subscription_id
        FROM subscriptions s
        WHERE s.member_id = p_user_id
          AND COALESCE(s.status, '') <> 'cancelled'
          AND s.start_date::date <= v_course_date
          AND s.end_date::date > v_course_date
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

CREATE OR REPLACE FUNCTION create_admin_registration_with_updates(
  p_user_id UUID,
  p_course_id INTEGER,
  p_current_participants INTEGER,
  p_subscription_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_registration_id INTEGER;
  v_qr_code TEXT;
  v_result JSON;
  v_group_deduction JSON;
BEGIN
  BEGIN
    SELECT deduct_group_session(p_user_id, p_course_id, p_subscription_id)
      INTO v_group_deduction;

    IF NOT (v_group_deduction->>'success')::BOOLEAN THEN
      RAISE EXCEPTION 'Group session deduction failed: %', v_group_deduction->>'error';
    END IF;

    v_qr_code := 'ADM_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 9);

    INSERT INTO class_registrations (member_id, course_id, qr_code, registration_date, status, notes, subscription_id)
    VALUES (p_user_id, p_course_id, v_qr_code, NOW(), 'registered', NULL, p_subscription_id)
    RETURNING id INTO v_registration_id;

    UPDATE courses
    SET current_participants = p_current_participants + 1,
        updated_at = NOW()
    WHERE id = p_course_id;

    SELECT json_build_object(
      'id', v_registration_id,
      'user_id', p_user_id,
      'course_id', p_course_id,
      'qr_code', v_qr_code,
      'registration_date', NOW(),
      'status', 'registered',
      'subscription_id', p_subscription_id,
      'group_session_info', v_group_deduction
    ) INTO v_result;

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Registration failed: %', SQLERRM;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION create_registration_with_updates(
  p_user_id UUID,
  p_course_id INTEGER,
  p_current_participants INTEGER,
  p_subscription_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_registration_id INTEGER;
  v_qr_code TEXT;
  v_result JSON;
  v_group_deduction JSON;
BEGIN
  BEGIN
    SELECT deduct_group_session(p_user_id, p_course_id, p_subscription_id)
      INTO v_group_deduction;

    IF NOT (v_group_deduction->>'success')::BOOLEAN THEN
      RAISE EXCEPTION 'Group session deduction failed: %', v_group_deduction->>'error';
    END IF;

    v_qr_code := 'REG_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 9);

    INSERT INTO class_registrations (member_id, course_id, qr_code, registration_date, status, notes, subscription_id)
    VALUES (p_user_id, p_course_id, v_qr_code, NOW(), 'registered', NULL, p_subscription_id)
    RETURNING id INTO v_registration_id;

    UPDATE courses
    SET current_participants = p_current_participants + 1,
        updated_at = NOW()
    WHERE id = p_course_id;

    SELECT json_build_object(
      'id', v_registration_id,
      'user_id', p_user_id,
      'course_id', p_course_id,
      'qr_code', v_qr_code,
      'registration_date', NOW(),
      'status', 'registered',
      'subscription_id', p_subscription_id,
      'group_session_info', v_group_deduction
    ) INTO v_result;

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Registration failed: %', SQLERRM;
  END;
END;
$$;

-- Align can_register with course-date coverage (not "active today")
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
      AND s.end_date::date > v_course_date
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
