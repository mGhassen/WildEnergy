-- Allow cancel refund to target a specific subscription (incl. expired/old).
-- Previously refund_group_session ignored p_subscription_id from cancel and
-- always resolved via registration lookup / active subscription.

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
              AND s.end_date::date > (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis')::date
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
      PERFORM refund_group_session(p_user_id, v_course_id, v_subscription_id);
    END IF;

    SELECT json_build_object(
      'success', true,
      'registration_id', p_registration_id,
      'course_id', v_course_id,
      'session_refunded', v_refund_session,
      'refund_subscription_id', v_subscription_id,
      'is_within_24_hours', p_is_within_24_hours
    ) INTO v_result;

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Cancellation failed: %', SQLERRM;
  END;
END;
$$;
