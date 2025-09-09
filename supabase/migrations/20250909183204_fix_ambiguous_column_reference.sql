-- Migration: Fix ambiguous column reference in user_profiles view
-- This migration fixes the ambiguous account_id reference by recreating the view

-- 1. Drop and recreate the user_profiles view with explicit column references
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
