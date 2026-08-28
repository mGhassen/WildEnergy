-- Cancel must actually refund when requested (no silent PERFORM).
-- Admin can cancel registered / absent / attended (old courses).

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
  v_refund_result JSON;
BEGIN
  BEGIN
    SELECT course_id, subscription_id INTO v_course_id, v_subscription_id
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
      SELECT refund_group_session(p_user_id, v_course_id, v_subscription_id)
        INTO v_refund_result;

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
      'is_within_24_hours', p_is_within_24_hours
    ) INTO v_result;

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Cancellation failed: %', SQLERRM;
  END;
END;
$$;
