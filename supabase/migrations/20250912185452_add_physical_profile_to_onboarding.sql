-- Add physical profile fields to member onboarding table
-- This allows us to track member's physical characteristics and goals for personalized pole dance experience

-- Add physical profile columns to member_onboarding table
ALTER TABLE member_onboarding ADD COLUMN physical_profile_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE member_onboarding ADD COLUMN physical_profile JSONB;

-- Add comments to clarify the purpose of these fields
COMMENT ON COLUMN member_onboarding.physical_profile_completed IS 'Whether the member has completed their physical profile setup';
COMMENT ON COLUMN member_onboarding.physical_profile IS 'JSON object containing physical profile data (gender, weight, height, goal, activity_level)';

-- Update the member_onboarding_status view to include the new fields
DROP VIEW IF EXISTS member_onboarding_status;

CREATE VIEW member_onboarding_status AS
SELECT 
    mo.id,
    mo.member_id,
    mo.personal_info_completed,
    mo.physical_profile_completed,
    mo.discovery_source,
    mo.terms_accepted,
    mo.terms_accepted_at,
    mo.onboarding_completed,
    mo.onboarding_completed_at,
    mo.created_at,
    mo.updated_at,
    m.status as member_status,
    m.account_id,
    a.email,
    p.first_name,
    p.last_name
FROM member_onboarding mo
JOIN members m ON mo.member_id = m.id
JOIN accounts a ON m.account_id = a.id
LEFT JOIN profiles p ON m.profile_id = p.id;
