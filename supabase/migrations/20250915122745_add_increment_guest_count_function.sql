-- Add function to increment guest count for a member
-- This function should be called whenever an admin registers a member as a guest

CREATE OR REPLACE FUNCTION increment_member_guest_count(
    p_member_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_count INTEGER;
    v_result JSON;
BEGIN
    -- Increment the guest_count for the specified member
    UPDATE members 
    SET guest_count = guest_count + 1,
        updated_at = NOW()
    WHERE id = p_member_id
    RETURNING guest_count INTO v_new_count;
    
    -- Check if the member was found
    IF v_new_count IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Member not found'
        );
    END IF;
    
    -- Return success with the new count
    RETURN json_build_object(
        'success', true,
        'member_id', p_member_id,
        'guest_count', v_new_count
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to increment guest count: ' || SQLERRM
        );
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION increment_member_guest_count(UUID) IS 'Increments the guest_count for a member by 1. Should be called when an admin registers a member as a guest.';

-- Add function to get member guest count
CREATE OR REPLACE FUNCTION get_member_guest_count(
    p_member_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_guest_count INTEGER;
    v_result JSON;
BEGIN
    -- Get the guest_count for the specified member
    SELECT guest_count INTO v_guest_count
    FROM members 
    WHERE id = p_member_id;
    
    -- Check if the member was found
    IF v_guest_count IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Member not found'
        );
    END IF;
    
    -- Return success with the count
    RETURN json_build_object(
        'success', true,
        'member_id', p_member_id,
        'guest_count', v_guest_count
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to get guest count: ' || SQLERRM
        );
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION get_member_guest_count(UUID) IS 'Gets the current guest_count for a member.';
