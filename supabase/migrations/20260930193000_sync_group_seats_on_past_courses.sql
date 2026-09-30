-- Past group bookings (attended / absent / still registered) should list every
-- active seat, not only classes from today onward.

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
      cr.status,
      cr.subscription_id,
      cr.session_source,
      cr.group_id,
      cr.pool_id
    FROM class_registrations cr
    WHERE cr.subscription_id = p_subscription_id
      AND COALESCE(cr.consumes_session, TRUE) = TRUE
      AND cr.status IN ('registered', 'attended', 'absent')
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
          SET status = v_reg.status,
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
        v_reg.status,
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
