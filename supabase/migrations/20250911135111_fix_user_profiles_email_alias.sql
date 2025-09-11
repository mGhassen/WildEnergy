-- Fix user_profiles view to include email alias for account_email
-- This allows existing code to use user_profiles.email without breaking changes

DROP VIEW IF EXISTS user_profiles;

CREATE VIEW user_profiles AS
SELECT 
    a.id as account_id,
    a.email as email, -- Keep email as the main field for backward compatibility
    a.email as account_email, -- Also provide account_email for explicit reference
    a.status as account_status,
    a.last_login,
    a.is_admin,
    p.first_name,
    p.last_name,
    p.phone,
    p.profile_email, -- Contact email separate from account email
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
