-- Restore account created_at on user_profiles (dropped when guest_count was added).
-- Surface email confirmation and last sign-in from auth.users for admin UI.

DROP VIEW IF EXISTS user_profiles;

CREATE VIEW user_profiles AS
SELECT
    a.id AS account_id,
    a.email AS email,
    a.email AS account_email,
    a.status AS account_status,
    COALESCE(a.last_login, au.last_sign_in_at) AS last_login,
    a.is_admin,
    a.created_at,
    au.email_confirmed_at AS confirmed_at,
    p.first_name,
    p.last_name,
    p.phone,
    p.profile_email,
    p.date_of_birth,
    p.address,
    p.profession,
    p.emergency_contact_name,
    p.emergency_contact_phone,
    p.profile_image_url,
    m.id AS member_id,
    m.member_notes,
    m.credit,
    m.status AS member_status,
    m.guest_count,
    t.id AS trainer_id,
    t.specialization,
    t.experience_years,
    t.bio,
    t.certification,
    t.hourly_rate,
    t.status AS trainer_status,
    CASE
        WHEN a.is_admin = true AND t.id IS NOT NULL AND m.id IS NOT NULL THEN 'admin_member_trainer'
        WHEN a.is_admin = true AND t.id IS NOT NULL THEN 'admin_trainer'
        WHEN a.is_admin = true AND m.id IS NOT NULL THEN 'admin_member'
        WHEN a.is_admin = true THEN 'admin'
        WHEN t.id IS NOT NULL AND m.id IS NOT NULL THEN 'member_trainer'
        WHEN t.id IS NOT NULL THEN 'trainer'
        WHEN m.id IS NOT NULL THEN 'member'
        ELSE 'account_only'
    END AS user_type,
    get_user_portals(a.id) AS accessible_portals
FROM accounts a
LEFT JOIN auth.users au ON au.id::text = a.auth_user_id
LEFT JOIN profiles p ON a.profile_id = p.id
LEFT JOIN members m ON a.id = m.account_id
LEFT JOIN trainers t ON a.id = t.account_id;

COMMENT ON VIEW user_profiles IS 'Joins accounts, auth.users (confirmation/last sign-in), profiles, members, trainers. Includes created_at, guest_count.';
