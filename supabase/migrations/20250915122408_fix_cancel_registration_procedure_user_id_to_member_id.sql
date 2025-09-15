-- Fix cancel_registration_with_updates procedure to use member_id instead of user_id
-- The class_registrations table was updated to use member_id, but the stored procedure still references user_id

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
  -- Start transaction
  BEGIN
    -- Get course_id, subscription_id, and current_participants from the registration
    -- Updated to use member_id instead of user_id
    SELECT course_id, subscription_id INTO v_course_id, v_subscription_id
    FROM class_registrations
    WHERE id = p_registration_id AND member_id = p_user_id AND status = 'registered';
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Registration not found or not in registered status';
    END IF;
    
    -- Use provided subscription_id if given (admin override), else use from registration
    IF p_subscription_id IS NOT NULL THEN
      v_subscription_id := p_subscription_id;
    END IF;
    
    -- Get current participants count
    SELECT current_participants INTO v_current_participants
    FROM courses
    WHERE id = v_course_id;
    
    -- Determine refund logic
    IF p_force_refund IS NOT NULL THEN
      v_refund_session := p_force_refund;
    ELSE
      v_refund_session := NOT p_is_within_24_hours;
    END IF;
    
    -- Update registration status to cancelled
    UPDATE class_registrations 
    SET status = 'cancelled',
        notes = CASE 
          WHEN v_refund_session THEN 'Cancelled - session refunded'
          ELSE 'Cancelled within 24 hours - session forfeited'
        END
    WHERE id = p_registration_id;
    
    -- Update course participants count (decrease by 1)
    UPDATE courses 
    SET current_participants = GREATEST(0, v_current_participants - 1),
        updated_at = NOW()
    WHERE id = v_course_id;
    
    -- Refund group session if refunding
    IF v_refund_session THEN
      -- Refund group session
      PERFORM refund_group_session(p_user_id, v_course_id);
      
      -- Also refund general subscription session for backward compatibility
      IF v_subscription_id IS NOT NULL THEN
        UPDATE subscriptions 
        SET sessions_remaining = sessions_remaining + 1,
            updated_at = NOW()
        WHERE id = v_subscription_id;
      END IF;
    END IF;
    
    -- Return the result
    SELECT json_build_object(
      'success', true,
      'registration_id', p_registration_id,
      'course_id', v_course_id,
      'session_refunded', v_refund_session,
      'is_within_24_hours', p_is_within_24_hours
    ) INTO v_result;
    
    RETURN v_result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback transaction on any error
      RAISE EXCEPTION 'Cancellation failed: %', SQLERRM;
  END;
END;
$$;

-- Also need to fix the create_registration_with_updates procedure
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
  -- Start transaction
  BEGIN
    -- Check if user can register for this course (group session check)
    SELECT deduct_group_session(p_user_id, p_course_id) INTO v_group_deduction;
    
    -- If group session deduction failed, return error
    IF NOT (v_group_deduction->>'success')::BOOLEAN THEN
      RAISE EXCEPTION 'Group session deduction failed: %', v_group_deduction->>'error';
    END IF;
    
    -- Generate QR code
    v_qr_code := 'REG_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 9);
    
    -- Create registration
    -- Updated to use member_id instead of user_id
    INSERT INTO class_registrations (member_id, course_id, qr_code, registration_date, status, notes, subscription_id)
    VALUES (p_user_id, p_course_id, v_qr_code, NOW(), 'registered', NULL, p_subscription_id)
    RETURNING id INTO v_registration_id;
    
    -- Update course participants count
    UPDATE courses 
    SET current_participants = p_current_participants + 1,
        updated_at = NOW()
    WHERE id = p_course_id;
    
    -- Also deduct from general subscription sessions for backward compatibility
    IF p_subscription_id IS NOT NULL THEN
      UPDATE subscriptions 
      SET sessions_remaining = sessions_remaining - 1,
          updated_at = NOW()
      WHERE id = p_subscription_id 
        AND sessions_remaining > 0;
    END IF;
    
    -- Return the created registration with group session info
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
      -- Rollback transaction on any error
      RAISE EXCEPTION 'Registration failed: %', SQLERRM;
  END;
END;
$$;

-- Also need to fix the other functions that reference user_id in subscriptions table
-- The subscriptions table was also updated to use member_id

CREATE OR REPLACE FUNCTION can_register_for_course(
    p_user_id UUID,
    p_course_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_subscription_id INTEGER;
    v_group_id INTEGER;
    v_sessions_remaining INTEGER;
    v_result JSON;
BEGIN
    -- Get the group_id for this course through class -> category -> group
    SELECT g.id INTO v_group_id
    FROM courses c
    JOIN classes cl ON c.class_id = cl.id
    JOIN categories cat ON cl.category_id = cat.id
    JOIN groups g ON cat.group_id = g.id
    WHERE c.id = p_course_id;
    
    -- If no group found, return error
    IF v_group_id IS NULL THEN
        RETURN json_build_object(
            'can_register', false,
            'error', 'Course group not found'
        );
    END IF;
    
    -- Get user's active subscription
    -- Updated to use member_id instead of user_id
    SELECT s.id INTO v_subscription_id
    FROM subscriptions s
    WHERE s.member_id = p_user_id
      AND s.status = 'active'
      AND s.end_date > NOW()
    ORDER BY s.end_date DESC
    LIMIT 1;
    
    -- If no active subscription, return error
    IF v_subscription_id IS NULL THEN
        RETURN json_build_object(
            'can_register', false,
            'error', 'No active subscription found'
        );
    END IF;
    
    -- Check if there are remaining sessions for this group
    SELECT sgs.sessions_remaining INTO v_sessions_remaining
    FROM subscription_group_sessions sgs
    WHERE sgs.subscription_id = v_subscription_id
      AND sgs.group_id = v_group_id;
    
    -- If no group sessions found, return error
    IF v_sessions_remaining IS NULL THEN
        RETURN json_build_object(
            'can_register', false,
            'error', 'No group sessions allocated for this course type'
        );
    END IF;
    
    -- Check if there are remaining sessions
    IF v_sessions_remaining <= 0 THEN
        RETURN json_build_object(
            'can_register', false,
            'error', 'No remaining sessions for this group',
            'group_id', v_group_id,
            'sessions_remaining', v_sessions_remaining
        );
    END IF;
    
    -- Can register
    RETURN json_build_object(
        'can_register', true,
        'subscription_id', v_subscription_id,
        'group_id', v_group_id,
        'sessions_remaining', v_sessions_remaining
    );
END;
$$;

CREATE OR REPLACE FUNCTION deduct_group_session(
    p_user_id UUID,
    p_course_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_subscription_id INTEGER;
    v_group_id INTEGER;
    v_sessions_remaining INTEGER;
    v_result JSON;
BEGIN
    -- Get the group_id for this course through class -> category -> group
    SELECT g.id INTO v_group_id
    FROM courses c
    JOIN classes cl ON c.class_id = cl.id
    JOIN categories cat ON cl.category_id = cat.id
    JOIN groups g ON cat.group_id = g.id
    WHERE c.id = p_course_id;
    
    -- If no group found, return error
    IF v_group_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Course group not found'
        );
    END IF;
    
    -- Get user's active subscription
    -- Updated to use member_id instead of user_id
    SELECT s.id INTO v_subscription_id
    FROM subscriptions s
    WHERE s.member_id = p_user_id
      AND s.status = 'active'
      AND s.end_date > NOW()
    ORDER BY s.end_date DESC
    LIMIT 1;
    
    -- If no active subscription, return error
    IF v_subscription_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No active subscription found'
        );
    END IF;
    
    -- Deduct one session from the group
    UPDATE subscription_group_sessions
    SET sessions_remaining = sessions_remaining - 1,
        updated_at = NOW()
    WHERE subscription_id = v_subscription_id
      AND group_id = v_group_id
      AND sessions_remaining > 0
    RETURNING sessions_remaining INTO v_sessions_remaining;
    
    -- If no rows updated, no sessions remaining
    IF v_sessions_remaining IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No remaining sessions for this group'
        );
    END IF;
    
    -- Success
    RETURN json_build_object(
        'success', true,
        'subscription_id', v_subscription_id,
        'group_id', v_group_id,
        'sessions_remaining', v_sessions_remaining
    );
END;
$$;

CREATE OR REPLACE FUNCTION refund_group_session(
    p_user_id UUID,
    p_course_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_subscription_id INTEGER;
    v_group_id INTEGER;
    v_sessions_remaining INTEGER;
    v_total_sessions INTEGER;
    v_result JSON;
BEGIN
    -- Get the group_id for this course through class -> category -> group
    SELECT g.id INTO v_group_id
    FROM courses c
    JOIN classes cl ON c.class_id = cl.id
    JOIN categories cat ON cl.category_id = cat.id
    JOIN groups g ON cat.group_id = g.id
    WHERE c.id = p_course_id;
    
    -- If no group found, return error
    IF v_group_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Course group not found'
        );
    END IF;
    
    -- Get user's active subscription
    -- Updated to use member_id instead of user_id
    SELECT s.id INTO v_subscription_id
    FROM subscriptions s
    WHERE s.member_id = p_user_id
      AND s.status = 'active'
      AND s.end_date > NOW()
    ORDER BY s.end_date DESC
    LIMIT 1;
    
    -- If no active subscription, return error
    IF v_subscription_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No active subscription found'
        );
    END IF;
    
    -- Get current total sessions to ensure we don't exceed the limit
    SELECT total_sessions INTO v_total_sessions
    FROM subscription_group_sessions
    WHERE subscription_id = v_subscription_id
      AND group_id = v_group_id;
    
    -- If no group sessions found, return error
    IF v_total_sessions IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No group sessions allocated for this course type'
        );
    END IF;
    
    -- Refund one session to the group (but don't exceed total_sessions)
    UPDATE subscription_group_sessions
    SET sessions_remaining = LEAST(sessions_remaining + 1, total_sessions),
        updated_at = NOW()
    WHERE subscription_id = v_subscription_id
      AND group_id = v_group_id
    RETURNING sessions_remaining INTO v_sessions_remaining;
    
    -- Success
    RETURN json_build_object(
        'success', true,
        'subscription_id', v_subscription_id,
        'group_id', v_group_id,
        'sessions_remaining', v_sessions_remaining
    );
END;
$$;
