-- Persist which dedicated group / pool session was consumed on registration.

ALTER TABLE class_registrations
  ADD COLUMN IF NOT EXISTS session_source TEXT
    CHECK (session_source IS NULL OR session_source IN ('dedicated', 'pool')),
  ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pool_id INTEGER REFERENCES plan_session_pools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_class_registrations_group_id
  ON class_registrations(group_id);
CREATE INDEX IF NOT EXISTS idx_class_registrations_pool_id
  ON class_registrations(pool_id);
CREATE INDEX IF NOT EXISTS idx_class_registrations_session_source
  ON class_registrations(session_source);

COMMENT ON COLUMN class_registrations.session_source IS
  'dedicated | pool — which balance was deducted at registration; null for guest / legacy';
COMMENT ON COLUMN class_registrations.group_id IS
  'Course session group resolved at deduct time';
COMMENT ON COLUMN class_registrations.pool_id IS
  'plan_session_pools.id when session_source = pool';

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
  v_current_participants INTEGER;
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

    SELECT current_participants INTO v_current_participants
    FROM courses
    WHERE id = v_course_id;

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
