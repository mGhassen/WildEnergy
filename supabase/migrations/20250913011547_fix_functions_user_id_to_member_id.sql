-- Fix functions to use member_id instead of user_id after column rename
-- This migration updates the existing functions to work with the renamed columns

-- Update can_register_for_course function
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
    -- Get the group_id for this course through class -> category -> category_groups -> group
    SELECT g.id INTO v_group_id
    FROM courses c
    JOIN classes cl ON c.class_id = cl.id
    JOIN category_groups cg ON cl.category_id = cg.category_id
    JOIN groups g ON cg.group_id = g.id
    WHERE c.id = p_course_id;
    
    -- If no group found, return error
    IF v_group_id IS NULL THEN
        RETURN json_build_object(
            'can_register', false,
            'error', 'Course group not found'
        );
    END IF;
    
    -- Get user's active subscription (using member_id instead of user_id)
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
        'group_id', v_group_id,
        'sessions_remaining', v_sessions_remaining
    );
END;
$$;

-- Update deduct_group_session function
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
    -- Get the group_id for this course through class -> category -> category_groups -> group
    SELECT g.id INTO v_group_id
    FROM courses c
    JOIN classes cl ON c.class_id = cl.id
    JOIN category_groups cg ON cl.category_id = cg.category_id
    JOIN groups g ON cg.group_id = g.id
    WHERE c.id = p_course_id;
    
    -- If no group found, return error
    IF v_group_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Course group not found'
        );
    END IF;
    
    -- Get user's active subscription (using member_id instead of user_id)
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
    
    -- Check if there are remaining sessions for this group
    SELECT sgs.sessions_remaining INTO v_sessions_remaining
    FROM subscription_group_sessions sgs
    WHERE sgs.subscription_id = v_subscription_id
      AND sgs.group_id = v_group_id;
    
    -- If no group sessions found, return error
    IF v_sessions_remaining IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No group sessions allocated for this course type'
        );
    END IF;
    
    -- Check if there are remaining sessions
    IF v_sessions_remaining <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No remaining sessions for this group',
            'group_id', v_group_id,
            'sessions_remaining', v_sessions_remaining
        );
    END IF;
    
    -- Deduct one session
    UPDATE subscription_group_sessions 
    SET sessions_remaining = sessions_remaining - 1,
        updated_at = NOW()
    WHERE subscription_id = v_subscription_id
      AND group_id = v_group_id;
    
    -- Return success with updated count
    RETURN json_build_object(
        'success', true,
        'group_id', v_group_id,
        'sessions_remaining', v_sessions_remaining - 1
    );
END;
$$;

-- Update create_registration_with_updates function
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
    
    -- Create registration (using member_id instead of user_id)
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
        'success', true,
        'registration_id', v_registration_id,
        'qr_code', v_qr_code,
        'group_deduction', v_group_deduction
    ) INTO v_result;
    
    RETURN v_result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback is automatic in case of exception
      RETURN json_build_object(
          'success', false,
          'error', SQLERRM
      );
  END;
END;
$$;
