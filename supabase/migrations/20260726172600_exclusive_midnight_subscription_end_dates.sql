-- Follow-up: exclusive midnight subscription ends.
-- Safe if 20260723161900 already ran as the old inclusive version (end -= 1):
-- this restores those rows (+1) and enforces exclusive active checks.
-- Also safe if never converted: UPDATE is a no-op when already exclusive.
--
-- Model: end = start + duration (exclusive). Valid while today < end_date.
-- Dies at midnight of end_date. 1-day plan: start=D, end=D+1 → active only on D.

UPDATE subscriptions s
SET
  end_date = s.end_date + INTERVAL '1 day',
  updated_at = NOW()
FROM plans p
WHERE p.id = s.plan_id
  AND p.duration_days >= 1
  AND (s.end_date::date - s.start_date::date) = (p.duration_days - 1);

-- Fix can_register_for_course function

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
    
    -- Get user's active subscription
    -- Updated to use member_id instead of user_id
    SELECT s.id INTO v_subscription_id
    FROM subscriptions s
    WHERE s.member_id = p_user_id
      AND s.status = 'active'
      AND s.end_date::date > (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis')::date
    ORDER BY s.end_date DESC
    LIMIT 1;
    
    -- If no active subscription, return error
    IF v_subscription_id IS NULL THEN
        RETURN json_build_object(
            'can_register', false,
            'error', 'No active subscription found'
        );
    END IF;
    
    -- Get remaining sessions for this group
    SELECT sessions_remaining INTO v_sessions_remaining
    FROM subscription_group_sessions
    WHERE subscription_id = v_subscription_id
      AND group_id = v_group_id;
    
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

-- Fix deduct_group_session function
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
    
    -- Get user's active subscription
    -- Updated to use member_id instead of user_id
    SELECT s.id INTO v_subscription_id
    FROM subscriptions s
    WHERE s.member_id = p_user_id
      AND s.status = 'active'
      AND s.end_date::date > (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis')::date
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

-- Fix refund_group_session function
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
    
    -- Get user's active subscription
    -- Updated to use member_id instead of user_id
    SELECT s.id INTO v_subscription_id
    FROM subscriptions s
    WHERE s.member_id = p_user_id
      AND s.status = 'active'
      AND s.end_date::date > (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis')::date
    ORDER BY s.end_date DESC
    LIMIT 1;
    
    -- If no active subscription, return error
    IF v_subscription_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No active subscription found'
        );
    END IF;
    
    -- Get current sessions remaining and total sessions
    SELECT sessions_remaining, total_sessions
    INTO v_sessions_remaining, v_total_sessions
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
