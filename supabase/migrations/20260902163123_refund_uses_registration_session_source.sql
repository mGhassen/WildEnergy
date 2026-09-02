-- Refund must credit the same balance that was deducted (registration tags),
-- not re-resolve (free-first), which can no-op via LEAST when the free pool is full.

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

    -- Prefer the balance tagged on the registration at deduct time.
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

        RETURN json_build_object(
            'success', true,
            'subscription_id', v_subscription_id,
            'group_id', p_group_id,
            'pool_id', v_pool_id,
            'source_type', 'pool',
            'sessions_remaining', v_sessions_remaining
        );
    END IF;

    -- Legacy / untagged: re-resolve (same preference as deduct when not requiring remaining).
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
  'Credits a session back. Prefer registration session_source/group_id/pool_id tags; fall back to resolve_session_allocation. Fails if target balance is already at capacity.';

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
  v_session_source TEXT;
  v_group_id INTEGER;
  v_pool_id INTEGER;
  v_current_participants INTEGER;
  v_result JSON;
  v_refund_session BOOLEAN;
  v_refund_result JSON;
BEGIN
  BEGIN
    SELECT course_id, subscription_id, session_source, group_id, pool_id
      INTO v_course_id, v_subscription_id, v_session_source, v_group_id, v_pool_id
    FROM class_registrations
    WHERE id = p_registration_id
      AND member_id = p_user_id
      AND status IN ('registered', 'absent', 'attended');

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Registration not found or cannot be cancelled';
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
          ELSE 'Cancelled - session forfeited'
        END
    WHERE id = p_registration_id;

    UPDATE courses
    SET current_participants = GREATEST(0, v_current_participants - 1),
        updated_at = NOW()
    WHERE id = v_course_id;

    IF v_refund_session THEN
      SELECT refund_group_session(
        p_user_id,
        v_course_id,
        v_subscription_id,
        v_session_source,
        v_group_id,
        v_pool_id
      ) INTO v_refund_result;

      IF v_refund_result IS NULL
         OR (v_refund_result->>'success')::boolean IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'Session refund failed: %',
          COALESCE(v_refund_result->>'error', 'unknown');
      END IF;
    END IF;

    SELECT json_build_object(
      'success', true,
      'registration_id', p_registration_id,
      'course_id', v_course_id,
      'session_refunded', v_refund_session,
      'refund_subscription_id', v_subscription_id,
      'refund_source_type', v_session_source,
      'refund_group_id', v_group_id,
      'refund_pool_id', v_pool_id,
      'is_within_24_hours', p_is_within_24_hours
    ) INTO v_result;

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Cancellation failed: %', SQLERRM;
  END;
END;
$$;
