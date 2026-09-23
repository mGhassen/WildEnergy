-- Keep courses.current_participants in sync with active registrations.
-- Booked seats = registered | attended | absent (cancelled do not occupy a seat).
--
-- Root cause of dashboard "2/10" vs participants "3 attended": racey absolute
-- writes of `current_participants = p_current_participants + 1` (and similar
-- read-modify-write paths) drifted the denormalized counter.

CREATE OR REPLACE FUNCTION sync_course_current_participants(p_course_id INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_course_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_count
  FROM class_registrations
  WHERE course_id = p_course_id
    AND status IN ('registered', 'attended', 'absent');

  UPDATE courses
  SET current_participants = v_count,
      updated_at = NOW()
  WHERE id = p_course_id;

  RETURN COALESCE(v_count, 0);
END;
$$;

COMMENT ON FUNCTION sync_course_current_participants(INTEGER) IS
  'Recount courses.current_participants from non-cancelled class_registrations.';

CREATE OR REPLACE FUNCTION trg_sync_course_current_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM sync_course_current_participants(OLD.course_id);
    RETURN OLD;
  END IF;

  PERFORM sync_course_current_participants(NEW.course_id);

  IF TG_OP = 'UPDATE'
     AND OLD.course_id IS DISTINCT FROM NEW.course_id THEN
    PERFORM sync_course_current_participants(OLD.course_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_course_current_participants ON class_registrations;

CREATE TRIGGER trg_sync_course_current_participants
  AFTER INSERT OR DELETE OR UPDATE OF status, course_id
  ON class_registrations
  FOR EACH ROW
  EXECUTE FUNCTION trg_sync_course_current_participants();

-- Repair all existing courses from source of truth
UPDATE courses c
SET current_participants = COALESCE((
  SELECT COUNT(*)::INTEGER
  FROM class_registrations r
  WHERE r.course_id = c.id
    AND r.status IN ('registered', 'attended', 'absent')
), 0),
updated_at = NOW();

-- Registration helpers: stop absolute counter writes (trigger owns the count).
-- p_current_participants is retained for call-site compatibility but ignored.

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
  v_source TEXT;
  v_group_id INTEGER;
  v_pool_id INTEGER;
BEGIN
  BEGIN
    SELECT deduct_group_session(p_user_id, p_course_id, p_subscription_id)
      INTO v_group_deduction;

    IF NOT (v_group_deduction->>'success')::BOOLEAN THEN
      RAISE EXCEPTION 'Group session deduction failed: %', v_group_deduction->>'error';
    END IF;

    v_source := v_group_deduction->>'source_type';
    v_group_id := NULLIF(v_group_deduction->>'group_id', '')::INTEGER;
    v_pool_id := NULLIF(v_group_deduction->>'pool_id', '')::INTEGER;

    v_qr_code := 'ADM_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 9);

    INSERT INTO class_registrations (
      member_id, course_id, qr_code, registration_date, status, notes,
      subscription_id, session_source, group_id, pool_id
    )
    VALUES (
      p_user_id, p_course_id, v_qr_code, NOW(), 'registered', NULL,
      p_subscription_id, v_source, v_group_id, v_pool_id
    )
    RETURNING id INTO v_registration_id;
    -- current_participants synced by trg_sync_course_current_participants
    -- p_current_participants retained for call-site compatibility (ignored)

    SELECT json_build_object(
      'id', v_registration_id,
      'user_id', p_user_id,
      'course_id', p_course_id,
      'qr_code', v_qr_code,
      'registration_date', NOW(),
      'status', 'registered',
      'subscription_id', p_subscription_id,
      'session_source', v_source,
      'group_id', v_group_id,
      'pool_id', v_pool_id,
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
  v_source TEXT;
  v_group_id INTEGER;
  v_pool_id INTEGER;
BEGIN
  BEGIN
    SELECT deduct_group_session(p_user_id, p_course_id, p_subscription_id)
      INTO v_group_deduction;

    IF NOT (v_group_deduction->>'success')::BOOLEAN THEN
      RAISE EXCEPTION 'Group session deduction failed: %', v_group_deduction->>'error';
    END IF;

    v_source := v_group_deduction->>'source_type';
    v_group_id := NULLIF(v_group_deduction->>'group_id', '')::INTEGER;
    v_pool_id := NULLIF(v_group_deduction->>'pool_id', '')::INTEGER;

    v_qr_code := 'REG_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 9);

    INSERT INTO class_registrations (
      member_id, course_id, qr_code, registration_date, status, notes,
      subscription_id, session_source, group_id, pool_id
    )
    VALUES (
      p_user_id, p_course_id, v_qr_code, NOW(), 'registered', NULL,
      p_subscription_id, v_source, v_group_id, v_pool_id
    )
    RETURNING id INTO v_registration_id;
    -- current_participants synced by trg_sync_course_current_participants
    -- p_current_participants retained for call-site compatibility (ignored)

    SELECT json_build_object(
      'id', v_registration_id,
      'user_id', p_user_id,
      'course_id', p_course_id,
      'qr_code', v_qr_code,
      'registration_date', NOW(),
      'status', 'registered',
      'subscription_id', p_subscription_id,
      'session_source', v_source,
      'group_id', v_group_id,
      'pool_id', v_pool_id,
      'group_session_info', v_group_deduction
    ) INTO v_result;

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Registration failed: %', SQLERRM;
  END;
END;
$$;

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
  v_deduction JSON;
  v_result JSON;
  v_active_id INTEGER;
  v_source TEXT;
  v_group_id INTEGER;
  v_pool_id INTEGER;
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

    v_source := NULL;
    v_group_id := NULL;
    v_pool_id := NULL;

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

      v_source := v_deduction->>'source_type';
      v_group_id := NULLIF(v_deduction->>'group_id', '')::INTEGER;
      v_pool_id := NULLIF(v_deduction->>'pool_id', '')::INTEGER;
    END IF;

    UPDATE class_registrations
    SET status = 'registered',
        subscription_id = COALESCE(v_subscription_id, subscription_id),
        session_source = v_source,
        group_id = v_group_id,
        pool_id = v_pool_id,
        notes = CASE
          WHEN p_consume_session THEN 'Restored - session consumed'
          ELSE 'Restored - no session consumed'
        END
    WHERE id = p_registration_id;

    SELECT json_build_object(
      'success', true,
      'registration_id', p_registration_id,
      'course_id', v_course_id,
      'member_id', v_member_id,
      'session_consumed', p_consume_session,
      'subscription_id', v_subscription_id,
      'session_source', v_source,
      'group_id', v_group_id,
      'pool_id', v_pool_id,
      'deduction', v_deduction
    ) INTO v_result;

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Restore failed: %', SQLERRM;
  END;
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
  v_session_source TEXT;
  v_group_id INTEGER;
  v_pool_id INTEGER;
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
