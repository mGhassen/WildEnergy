-- Create a stored procedure to handle registration with course update and subscription deduction
-- This ensures all operations succeed or fail together (atomicity)

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
BEGIN
  -- Start transaction
  BEGIN
    -- Generate QR code
    v_qr_code := 'REG_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 9);
    
    -- Create registration
    INSERT INTO class_registrations (user_id, course_id, qr_code, registration_date, status, notes)
    VALUES (p_user_id, p_course_id, v_qr_code, NOW(), 'registered', NULL)
    RETURNING id INTO v_registration_id;
    
    -- Update course participants count
    UPDATE courses 
    SET current_participants = p_current_participants + 1,
        updated_at = NOW()
    WHERE id = p_course_id;
    
    -- Deduct session from subscription if provided
    IF p_subscription_id IS NOT NULL THEN
      UPDATE subscriptions 
      SET sessions_remaining = sessions_remaining - 1,
          updated_at = NOW()
      WHERE id = p_subscription_id 
        AND sessions_remaining > 0;
    END IF;
    
    -- Return the created registration
    SELECT json_build_object(
      'id', v_registration_id,
      'user_id', p_user_id,
      'course_id', p_course_id,
      'qr_code', v_qr_code,
      'registration_date', NOW(),
      'status', 'registered'
    ) INTO v_result;
    
    RETURN v_result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback transaction on any error
      RAISE EXCEPTION 'Registration failed: %', SQLERRM;
  END;
END;
$$;

-- Create a stored procedure to handle registration cancellation with session refund
-- This ensures all operations succeed or fail together (atomicity)

CREATE OR REPLACE FUNCTION cancel_registration_with_updates(
  p_registration_id INTEGER,
  p_user_id UUID,
  p_is_within_24_hours BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_course_id INTEGER;
  v_subscription_id INTEGER;
  v_current_participants INTEGER;
  v_result JSON;
BEGIN
  -- Start transaction
  BEGIN
    -- Get course_id and current_participants from the registration
    SELECT course_id INTO v_course_id
    FROM class_registrations
    WHERE id = p_registration_id AND user_id = p_user_id AND status = 'registered';
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Registration not found or not in registered status';
    END IF;
    
    -- Get current participants count
    SELECT current_participants INTO v_current_participants
    FROM courses
    WHERE id = v_course_id;
    
    -- Get user's active subscription
    SELECT id INTO v_subscription_id
    FROM subscriptions
    WHERE user_id = p_user_id AND status = 'active'
    ORDER BY end_date DESC
    LIMIT 1;
    
    -- Update registration status to cancelled
    UPDATE class_registrations 
    SET status = 'cancelled',
        notes = CASE 
          WHEN p_is_within_24_hours THEN 'Cancelled within 24 hours - session forfeited'
          ELSE 'Cancelled - session refunded'
        END
    WHERE id = p_registration_id;
    
    -- Update course participants count (decrease by 1)
    UPDATE courses 
    SET current_participants = GREATEST(0, v_current_participants - 1),
        updated_at = NOW()
    WHERE id = v_course_id;
    
    -- Refund session to subscription if not within 24 hours
    IF NOT p_is_within_24_hours AND v_subscription_id IS NOT NULL THEN
      UPDATE subscriptions 
      SET sessions_remaining = sessions_remaining + 1,
          updated_at = NOW()
      WHERE id = v_subscription_id;
    END IF;
    
    -- Return the result
    SELECT json_build_object(
      'success', true,
      'registration_id', p_registration_id,
      'course_id', v_course_id,
      'session_refunded', NOT p_is_within_24_hours,
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