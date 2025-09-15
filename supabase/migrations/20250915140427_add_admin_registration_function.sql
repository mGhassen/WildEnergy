-- Create admin-specific registration function with ADM_ prefix
-- This function is identical to create_registration_with_updates but uses ADM_ prefix for QR codes

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
BEGIN
  -- Start transaction
  BEGIN
    -- Check if user can register for this course (group session check)
    SELECT deduct_group_session(p_user_id, p_course_id) INTO v_group_deduction;
    
    -- If group session deduction failed, return error
    IF NOT (v_group_deduction->>'success')::BOOLEAN THEN
      RAISE EXCEPTION 'Group session deduction failed: %', v_group_deduction->>'error';
    END IF;
    
    -- Generate QR code with ADM_ prefix for admin registrations
    v_qr_code := 'ADM_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 9);
    
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
