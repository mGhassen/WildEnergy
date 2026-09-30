-- Group-plan seats share one booking: each active seat gets a course
-- registration, but only the original booking consumes a session.

ALTER TABLE class_registrations
  ADD COLUMN IF NOT EXISTS consumes_session BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN class_registrations.consumes_session IS
  'False for group-plan seat companions. They appear on the course roster and do not deduct another session.';

CREATE OR REPLACE FUNCTION sync_group_seat_course_registrations(p_subscription_id INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_seats INTEGER;
  v_changed INTEGER := 0;
  v_reg RECORD;
  v_seat RECORD;
  v_existing_id INTEGER;
  v_existing_status TEXT;
  v_existing_notes TEXT;
BEGIN
  SELECT p.max_seats INTO v_max_seats
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.id = p_subscription_id;

  IF COALESCE(v_max_seats, 1) <= 1 THEN
    RETURN 0;
  END IF;

  FOR v_reg IN
    SELECT DISTINCT ON (cr.course_id)
      cr.course_id,
      cr.subscription_id,
      cr.session_source,
      cr.group_id,
      cr.pool_id
    FROM class_registrations cr
    JOIN courses c ON c.id = cr.course_id
    WHERE cr.subscription_id = p_subscription_id
      AND COALESCE(cr.consumes_session, TRUE) = TRUE
      AND cr.status = 'registered'
      AND c.course_date::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis')::date
    ORDER BY cr.course_id, cr.id
  LOOP
    FOR v_seat IN
      SELECT ss.member_id
      FROM subscription_seats ss
      WHERE ss.subscription_id = p_subscription_id
        AND ss.status = 'active'
    LOOP
      v_existing_id := NULL;
      v_existing_status := NULL;
      v_existing_notes := NULL;

      SELECT cr.id, cr.status, cr.notes
        INTO v_existing_id, v_existing_status, v_existing_notes
      FROM class_registrations cr
      WHERE cr.course_id = v_reg.course_id
        AND cr.member_id = v_seat.member_id
        AND (
          cr.status IN ('registered', 'attended', 'absent')
          OR (
            cr.subscription_id = p_subscription_id
            AND cr.consumes_session = FALSE
          )
        )
      ORDER BY
        CASE WHEN cr.status IN ('registered', 'attended', 'absent') THEN 0 ELSE 1 END,
        cr.id DESC
      LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        IF v_existing_status IN ('registered', 'attended', 'absent') THEN
          CONTINUE;
        END IF;

        IF v_existing_notes IN (
          'Seat revoked — session was shared',
          'Cancelled with group booking'
        ) THEN
          UPDATE class_registrations
          SET status = 'registered',
              notes = 'Group seat — shares the subscription session',
              consumes_session = FALSE,
              subscription_id = v_reg.subscription_id,
              session_source = v_reg.session_source,
              group_id = v_reg.group_id,
              pool_id = v_reg.pool_id
          WHERE id = v_existing_id;
          v_changed := v_changed + 1;
        END IF;

        CONTINUE;
      END IF;

      INSERT INTO class_registrations (
        member_id,
        course_id,
        qr_code,
        registration_date,
        status,
        notes,
        subscription_id,
        session_source,
        group_id,
        pool_id,
        consumes_session
      ) VALUES (
        v_seat.member_id,
        v_reg.course_id,
        'SEAT_' || replace(v_seat.member_id::text, '-', '') || '_' || v_reg.course_id::text || '_' || substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 8),
        NOW(),
        'registered',
        'Group seat — shares the subscription session',
        v_reg.subscription_id,
        v_reg.session_source,
        v_reg.group_id,
        v_reg.pool_id,
        FALSE
      );
      v_changed := v_changed + 1;
    END LOOP;
  END LOOP;

  RETURN v_changed;
END;
$$;

CREATE OR REPLACE FUNCTION drop_group_seat_course_registrations(
  p_subscription_id INTEGER,
  p_member_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE class_registrations cr
  SET status = 'cancelled',
      notes = 'Seat revoked — session was shared'
  FROM courses c
  WHERE cr.course_id = c.id
    AND cr.subscription_id = p_subscription_id
    AND cr.member_id = p_member_id
    AND cr.consumes_session = FALSE
    AND cr.status = 'registered'
    AND c.course_date::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis')::date;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Replay must ignore seat companions so shared bookings do not burn extra sessions.
CREATE OR REPLACE FUNCTION reconcile_subscription_sessions(
    p_subscription_id INTEGER,
    p_fix_registrations BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_plan_id INTEGER;
    v_reg RECORD;
    v_alloc RECORD;
    v_group_remaining JSONB := '{}'::JSONB;
    v_pool_remaining JSONB := '{}'::JSONB;
    v_group_totals JSONB := '{}'::JSONB;
    v_pool_totals JSONB := '{}'::JSONB;
    v_regs_replayed INTEGER := 0;
    v_regs_retagged INTEGER := 0;
    v_regs_skipped INTEGER := 0;
    v_before JSONB;
    v_after JSONB;
    v_key TEXT;
    v_val INTEGER;
    v_warnings JSONB := '[]'::JSONB;
BEGIN
    SELECT plan_id INTO v_plan_id
    FROM subscriptions
    WHERE id = p_subscription_id;

    IF v_plan_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Subscription not found'
        );
    END IF;

    PERFORM ensure_subscription_group_sessions(p_subscription_id);

    SELECT jsonb_object_agg(sgs.group_id::TEXT, sgs.sessions_remaining)
      INTO v_before
    FROM subscription_group_sessions sgs
    WHERE sgs.subscription_id = p_subscription_id;

    SELECT COALESCE(
        (
            SELECT jsonb_object_agg(sps.pool_id::TEXT, sps.sessions_remaining)
            FROM subscription_pool_sessions sps
            WHERE sps.subscription_id = p_subscription_id
        ),
        '{}'::JSONB
    ) || COALESCE(v_before, '{}'::JSONB)
    INTO v_before;

    FOR v_key, v_val IN
        SELECT sgs.group_id::TEXT, sgs.total_sessions
        FROM subscription_group_sessions sgs
        WHERE sgs.subscription_id = p_subscription_id
    LOOP
        v_group_totals := jsonb_set(v_group_totals, ARRAY[v_key], to_jsonb(v_val), true);
        v_group_remaining := jsonb_set(v_group_remaining, ARRAY[v_key], to_jsonb(v_val), true);
    END LOOP;

    FOR v_key, v_val IN
        SELECT sps.pool_id::TEXT, sps.total_sessions
        FROM subscription_pool_sessions sps
        WHERE sps.subscription_id = p_subscription_id
    LOOP
        v_pool_totals := jsonb_set(v_pool_totals, ARRAY[v_key], to_jsonb(v_val), true);
        v_pool_remaining := jsonb_set(v_pool_remaining, ARRAY[v_key], to_jsonb(v_val), true);
    END LOOP;

    FOR v_reg IN
        SELECT cr.id, cr.course_id, cr.pool_id, cr.group_id, cr.session_source, cr.status, cr.notes
        FROM class_registrations cr
        WHERE cr.subscription_id = p_subscription_id
          AND COALESCE(cr.consumes_session, TRUE) = TRUE
          AND (
            cr.status IN ('registered', 'attended', 'absent')
            OR (
              cr.status = 'cancelled'
              AND COALESCE(cr.notes, '') NOT ILIKE '%session refunded%'
            )
          )
        ORDER BY cr.registration_date ASC NULLS LAST, cr.id ASC
    LOOP
        v_regs_replayed := v_regs_replayed + 1;

        SELECT * INTO v_alloc
        FROM pick_allocation_from_sim(
            p_subscription_id,
            v_reg.course_id,
            v_group_remaining,
            v_pool_remaining
        );

        IF v_alloc IS NULL OR v_alloc.source_type IS NULL THEN
            v_regs_skipped := v_regs_skipped + 1;
            v_warnings := v_warnings || jsonb_build_array(
                jsonb_build_object(
                    'registration_id', v_reg.id,
                    'course_id', v_reg.course_id,
                    'warning', 'No simulated balance available — registration not replayed'
                )
            );
            CONTINUE;
        END IF;

        IF v_alloc.source_type = 'dedicated' THEN
            v_key := v_alloc.group_id::TEXT;
            v_val := COALESCE((v_group_remaining->>v_key)::INTEGER, 0) - 1;
            v_group_remaining := jsonb_set(v_group_remaining, ARRAY[v_key], to_jsonb(GREATEST(v_val, 0)), true);
        ELSE
            v_key := v_alloc.pool_id::TEXT;
            v_val := COALESCE((v_pool_remaining->>v_key)::INTEGER, 0) - 1;
            v_pool_remaining := jsonb_set(v_pool_remaining, ARRAY[v_key], to_jsonb(GREATEST(v_val, 0)), true);
        END IF;

        IF p_fix_registrations THEN
            IF v_reg.session_source IS DISTINCT FROM v_alloc.source_type
               OR v_reg.group_id IS DISTINCT FROM v_alloc.group_id
               OR v_reg.pool_id IS DISTINCT FROM v_alloc.pool_id THEN
                v_regs_retagged := v_regs_retagged + 1;
            END IF;

            UPDATE class_registrations
            SET session_source = v_alloc.source_type,
                group_id = v_alloc.group_id,
                pool_id = v_alloc.pool_id
            WHERE id = v_reg.id;
        END IF;
    END LOOP;

    IF p_fix_registrations THEN
        UPDATE subscription_group_sessions sgs
        SET sessions_remaining = COALESCE((v_group_remaining->>sgs.group_id::TEXT)::INTEGER, 0),
            updated_at = NOW()
        WHERE sgs.subscription_id = p_subscription_id;

        UPDATE subscription_pool_sessions sps
        SET sessions_remaining = COALESCE((v_pool_remaining->>sps.pool_id::TEXT)::INTEGER, 0),
            updated_at = NOW()
        WHERE sps.subscription_id = p_subscription_id;
    END IF;

    SELECT COALESCE(
        (
            SELECT jsonb_object_agg(sps.pool_id::TEXT, sps.sessions_remaining)
            FROM subscription_pool_sessions sps
            WHERE sps.subscription_id = p_subscription_id
        ),
        '{}'::JSONB
    ) || COALESCE(
        (
            SELECT jsonb_object_agg(sgs.group_id::TEXT, sgs.sessions_remaining)
            FROM subscription_group_sessions sgs
            WHERE sgs.subscription_id = p_subscription_id
        ),
        '{}'::JSONB
    )
    INTO v_after;

    RETURN json_build_object(
        'success', true,
        'subscription_id', p_subscription_id,
        'plan_id', v_plan_id,
        'fix_registrations', p_fix_registrations,
        'registrations_replayed', v_regs_replayed,
        'registrations_retagged', v_regs_retagged,
        'registrations_skipped', v_regs_skipped,
        'remaining_before', v_before,
        'remaining_after_simulation', CASE
            WHEN p_fix_registrations THEN v_after
            ELSE v_pool_remaining || v_group_remaining
        END,
        'totals', v_pool_totals || v_group_totals,
        'warnings', v_warnings
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

    PERFORM sync_group_seat_course_registrations(p_subscription_id);

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

    PERFORM sync_group_seat_course_registrations(p_subscription_id);

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
  v_consumes_session BOOLEAN;
BEGIN
  BEGIN
    SELECT member_id, course_id, subscription_id, COALESCE(consumes_session, TRUE)
      INTO v_member_id, v_course_id, v_subscription_id, v_consumes_session
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

    IF NOT v_consumes_session THEN
      UPDATE class_registrations
      SET status = 'registered',
          notes = 'Group seat — shares the subscription session',
          consumes_session = FALSE
      WHERE id = p_registration_id;

      RETURN json_build_object(
        'success', true,
        'registration_id', p_registration_id,
        'course_id', v_course_id,
        'member_id', v_member_id,
        'session_consumed', false,
        'subscription_id', v_subscription_id
      );
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

    IF v_subscription_id IS NOT NULL THEN
      PERFORM sync_group_seat_course_registrations(v_subscription_id);
    END IF;

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
  v_consumes_session BOOLEAN;
  v_result JSON;
  v_refund_session BOOLEAN;
  v_refund_result JSON;
BEGIN
  BEGIN
    SELECT course_id, subscription_id, session_source, group_id, pool_id,
           COALESCE(consumes_session, TRUE)
      INTO v_course_id, v_subscription_id, v_session_source, v_group_id, v_pool_id,
           v_consumes_session
    FROM class_registrations
    WHERE id = p_registration_id
      AND member_id = p_user_id
      AND status IN ('registered', 'absent', 'attended');

    IF NOT FOUND THEN
      PERFORM 1
      FROM class_registrations
      WHERE id = p_registration_id
        AND member_id = p_user_id
        AND status = 'cancelled';

      IF FOUND THEN
        RETURN json_build_object(
          'success', true,
          'registration_id', p_registration_id,
          'session_refunded', false,
          'already_cancelled', true
        );
      END IF;

      RAISE EXCEPTION 'Registration not found or cannot be cancelled';
    END IF;

    IF p_subscription_id IS NOT NULL THEN
      v_subscription_id := p_subscription_id;
    END IF;

    -- Seat companions share the session already taken by the booking.
    IF NOT v_consumes_session THEN
      UPDATE class_registrations
      SET status = 'cancelled'
      WHERE id = p_registration_id;

      RETURN json_build_object(
        'success', true,
        'registration_id', p_registration_id,
        'course_id', v_course_id,
        'session_refunded', false,
        'refund_subscription_id', v_subscription_id,
        'is_within_24_hours', p_is_within_24_hours
      );
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

    IF v_subscription_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM class_registrations
      WHERE subscription_id = v_subscription_id
        AND course_id = v_course_id
        AND COALESCE(consumes_session, TRUE) = TRUE
        AND status IN ('registered', 'attended', 'absent')
    ) THEN
      UPDATE class_registrations
      SET status = 'cancelled',
          notes = 'Cancelled with group booking'
      WHERE subscription_id = v_subscription_id
        AND course_id = v_course_id
        AND consumes_session = FALSE
        AND status = 'registered';
    END IF;

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
