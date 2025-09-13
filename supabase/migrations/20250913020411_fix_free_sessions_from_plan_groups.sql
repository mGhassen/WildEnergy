-- Fix free sessions handling by prioritizing free groups over paid groups
-- This migration updates functions to consume from free groups first when a course can belong to multiple groups

-- Update the can_register_for_course function to prioritize free groups
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
    v_is_free BOOLEAN;
    v_result JSON;
BEGIN
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
    
    -- Find the best group for this course (prioritize free groups)
    -- Get all available groups for this course and prioritize free ones
    SELECT g.id, sgs.sessions_remaining, pg.is_free
    INTO v_group_id, v_sessions_remaining, v_is_free
    FROM courses c
    JOIN classes cl ON c.class_id = cl.id
    JOIN category_groups cg ON cl.category_id = cg.category_id
    JOIN groups g ON cg.group_id = g.id
    JOIN subscription_group_sessions sgs ON sgs.group_id = g.id
    JOIN subscriptions s ON s.id = sgs.subscription_id
    JOIN plan_groups pg ON pg.plan_id = s.plan_id AND pg.group_id = g.id
    WHERE c.id = p_course_id
      AND sgs.subscription_id = v_subscription_id
      AND sgs.sessions_remaining > 0
    ORDER BY pg.is_free DESC, sgs.sessions_remaining DESC
    LIMIT 1;
    
    -- If no group found, return error
    IF v_group_id IS NULL THEN
        RETURN json_build_object(
            'can_register', false,
            'error', 'No group sessions available for this course'
        );
    END IF;
    
    -- Can register
    RETURN json_build_object(
        'can_register', true,
        'group_id', v_group_id,
        'sessions_remaining', v_sessions_remaining,
        'is_free', v_is_free
    );
END;
$$;

-- Update the deduct_group_session function to prioritize free groups
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
    v_is_free BOOLEAN;
    v_result JSON;
BEGIN
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
    
    -- Find the best group for this course (prioritize free groups)
    -- Get all available groups for this course and prioritize free ones
    SELECT g.id, sgs.sessions_remaining, pg.is_free
    INTO v_group_id, v_sessions_remaining, v_is_free
    FROM courses c
    JOIN classes cl ON c.class_id = cl.id
    JOIN category_groups cg ON cl.category_id = cg.category_id
    JOIN groups g ON cg.group_id = g.id
    JOIN subscription_group_sessions sgs ON sgs.group_id = g.id
    JOIN subscriptions s ON s.id = sgs.subscription_id
    JOIN plan_groups pg ON pg.plan_id = s.plan_id AND pg.group_id = g.id
    WHERE c.id = p_course_id
      AND sgs.subscription_id = v_subscription_id
      AND sgs.sessions_remaining > 0
    ORDER BY pg.is_free DESC, sgs.sessions_remaining DESC
    LIMIT 1;
    
    -- If no group found, return error
    IF v_group_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No group sessions available for this course'
        );
    END IF;
    
    -- Deduct one session from the selected group
    UPDATE subscription_group_sessions 
    SET sessions_remaining = sessions_remaining - 1,
        updated_at = NOW()
    WHERE subscription_id = v_subscription_id
      AND group_id = v_group_id;
    
    -- Return success with updated count and free status
    RETURN json_build_object(
        'success', true,
        'group_id', v_group_id,
        'sessions_remaining', v_sessions_remaining - 1,
        'is_free', v_is_free,
        'message', CASE 
            WHEN v_is_free THEN 'Free group session consumed'
            ELSE 'Paid group session consumed'
        END
    );
END;
$$;

-- Update the refund_group_session function to work with the prioritized group selection
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
    v_is_free BOOLEAN;
    v_max_sessions INTEGER;
    v_result JSON;
BEGIN
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
    
    -- Find the group that was used for this course (prioritize free groups)
    -- Get all available groups for this course and prioritize free ones
    SELECT g.id, sgs.sessions_remaining, pg.is_free, pg.session_count
    INTO v_group_id, v_sessions_remaining, v_is_free, v_max_sessions
    FROM courses c
    JOIN classes cl ON c.class_id = cl.id
    JOIN category_groups cg ON cl.category_id = cg.category_id
    JOIN groups g ON cg.group_id = g.id
    JOIN subscription_group_sessions sgs ON sgs.group_id = g.id
    JOIN subscriptions s ON s.id = sgs.subscription_id
    JOIN plan_groups pg ON pg.plan_id = s.plan_id AND pg.group_id = g.id
    WHERE c.id = p_course_id
      AND sgs.subscription_id = v_subscription_id
    ORDER BY pg.is_free DESC, sgs.sessions_remaining DESC
    LIMIT 1;
    
    -- If no group found, return error
    IF v_group_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No group sessions found for this course'
        );
    END IF;
    
    -- Refund one session to the group (but don't exceed max_sessions from plan_groups)
    UPDATE subscription_group_sessions
    SET sessions_remaining = LEAST(sessions_remaining + 1, v_max_sessions),
        updated_at = NOW()
    WHERE subscription_id = v_subscription_id
      AND group_id = v_group_id
    RETURNING sessions_remaining INTO v_sessions_remaining;
    
    -- Success
    RETURN json_build_object(
        'success', true,
        'group_id', v_group_id,
        'sessions_remaining', v_sessions_remaining,
        'is_free', v_is_free
    );
END;
$$;

-- Update the comment to reflect the new structure
COMMENT ON TABLE subscription_group_sessions IS 'Tracks remaining sessions per group for each subscription. Free groups are prioritized over paid groups when a course can belong to multiple groups.';