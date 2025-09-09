-- Migration: Update functions and views for simplified admin system
-- This migration updates get_user_portals function and user_profiles view to use is_admin

-- 1. Update get_user_portals function to use is_admin instead of admin_roles
CREATE OR REPLACE FUNCTION get_user_portals(account_id UUID)
RETURNS TEXT[] AS $$
DECLARE
    portals TEXT[] := '{}';
BEGIN
    -- Check admin access (based on is_admin column)
    IF EXISTS (SELECT 1 FROM accounts 
               WHERE id = account_id AND status = 'active' AND is_admin = true) THEN
        portals := array_append(portals, 'admin');
    END IF;
    
    -- Check member access
    IF EXISTS (SELECT 1 FROM members WHERE members.account_id = get_user_portals.account_id AND status = 'active') THEN
        portals := array_append(portals, 'member');
    END IF;
    
    -- Check trainer access
    IF EXISTS (SELECT 1 FROM trainers WHERE trainers.account_id = get_user_portals.account_id AND status = 'active') THEN
        portals := array_append(portals, 'trainer');
    END IF;
    
    RETURN portals;
END;
$$ LANGUAGE plpgsql;

-- 2. Update user_profiles view to use is_admin
DROP VIEW IF EXISTS user_profiles;

CREATE VIEW user_profiles AS
SELECT 
    a.id as account_id,
    a.email,
    a.status as account_status,
    a.last_login,
    a.is_admin,
    p.first_name,
    p.last_name,
    p.phone,
    p.date_of_birth,
    p.address,
    p.profession,
    p.emergency_contact_name,
    p.emergency_contact_phone,
    p.profile_image_url,
    m.id as member_id,
    m.member_notes,
    m.credit,
    m.status as member_status,
    m.subscription_status,
    t.id as trainer_id,
    t.specialization,
    t.experience_years,
    t.bio,
    t.certification,
    t.hourly_rate,
    t.status as trainer_status,
    CASE 
        WHEN a.is_admin = true AND t.id IS NOT NULL AND m.id IS NOT NULL THEN 'admin_member_trainer'
        WHEN a.is_admin = true AND t.id IS NOT NULL THEN 'admin_trainer'
        WHEN a.is_admin = true AND m.id IS NOT NULL THEN 'admin_member'
        WHEN a.is_admin = true THEN 'admin'
        WHEN t.id IS NOT NULL AND m.id IS NOT NULL THEN 'member_trainer'
        WHEN t.id IS NOT NULL THEN 'trainer'
        WHEN m.id IS NOT NULL THEN 'member'
        ELSE 'account_only'
    END as user_type,
    get_user_portals(a.id) as accessible_portals
FROM accounts a
LEFT JOIN profiles p ON a.id = p.id -- One profile per account
LEFT JOIN members m ON a.id = m.account_id
LEFT JOIN trainers t ON a.id = t.account_id;
