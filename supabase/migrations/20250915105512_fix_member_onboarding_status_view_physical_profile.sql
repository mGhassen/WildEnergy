-- Fix member_onboarding_status view to include missing physical profile fields
-- The previous migration accidentally removed physical_profile and physical_profile_completed fields

-- Drop and recreate the view with all required fields
DROP VIEW IF EXISTS member_onboarding_status;

CREATE VIEW member_onboarding_status AS
SELECT 
    mo.id,
    mo.member_id,
    mo.personal_info_completed,
    mo.physical_profile_completed,
    mo.physical_profile,
    mo.discovery_completed,
    mo.discovery_source,
    mo.terms_accepted,
    mo.terms_accepted_at,
    mo.terms_version_id,
    mo.onboarding_completed,
    mo.onboarding_completed_at,
    mo.created_at,
    mo.updated_at,
    m.status as member_status,
    m.account_id,
    a.email,
    p.first_name,
    p.last_name,
    -- Include terms version details
    tc.version as terms_version,
    tc.title as terms_title,
    tc.effective_date as terms_effective_date
FROM member_onboarding mo
JOIN members m ON mo.member_id = m.id
JOIN accounts a ON m.account_id = a.id
LEFT JOIN profiles p ON m.profile_id = p.id
LEFT JOIN terms_and_conditions tc ON mo.terms_version_id = tc.id;
