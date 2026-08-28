-- Restore a cancelled registration and optionally re-consume a session
-- from a chosen subscription (dedicated group or pool resolved by course).

CREATE OR REPLACE FUNCTION restore_cancelled_registration(
  p_registration_id INTEGER,
  p_subscription_id INTEGER DEFAULT NULL,
  p_consume_session BOOLEAN DEFAULT TRUE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_member_id UUID;
  v_course_id INTEGER;
  v_subscription_id INTEGER;
  v_current_participants INTEGER;
  v_deduction JSON;
  v_result JSON;
  v_active_id INTEGER;
BEGIN
  BEGIN
    SELECT member_id, course_id, subscription_id
      INTO v_member_id, v_course_id, v_subscription_id
    FROM class_registrations
    WHERE id = p_registration_id
      AND status = 'cancelled';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Registration not found or not cancelled';
    END IF;

    SELECT id INTO v_active_id
    FROM class_registrations
    WHERE member_id = v_member_id
      AND course_id = v_course_id
      AND status IN ('registered', 'absent', 'attended')
      AND id <> p_registration_id
    LIMIT 1;

    IF v_active_id IS NOT NULL THEN
      RAISE EXCEPTION 'Member already has an active registration for this course';
    END IF;

    IF p_subscription_id IS NOT NULL THEN
      v_subscription_id := p_subscription_id;
    END IF;

    IF p_consume_session THEN
      IF v_subscription_id IS NULL THEN
        RAISE EXCEPTION 'Select a subscription to consume the session';
      END IF;

      SELECT deduct_group_session(v_member_id, v_course_id, v_subscription_id)
        INTO v_deduction;

      IF v_deduction IS NULL
         OR (v_deduction->>'success')::boolean IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'Session consume failed: %',
          COALESCE(v_deduction->>'error', 'unknown');
      END IF;
    END IF;

    SELECT current_participants INTO v_current_participants
    FROM courses
    WHERE id = v_course_id;

    UPDATE class_registrations
    SET status = 'registered',
        subscription_id = COALESCE(v_subscription_id, subscription_id),
        notes = CASE
          WHEN p_consume_session THEN 'Restored - session consumed'
          ELSE 'Restored - no session consumed'
        END
    WHERE id = p_registration_id;

    UPDATE courses
    SET current_participants = v_current_participants + 1,
        updated_at = NOW()
    WHERE id = v_course_id;

    SELECT json_build_object(
      'success', true,
      'registration_id', p_registration_id,
      'course_id', v_course_id,
      'member_id', v_member_id,
      'session_consumed', p_consume_session,
      'subscription_id', v_subscription_id,
      'deduction', v_deduction
    ) INTO v_result;

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Restore failed: %', SQLERRM;
  END;
END;
$$;
