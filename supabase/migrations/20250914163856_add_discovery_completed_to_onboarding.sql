-- Add discovery_completed field to member onboarding table
-- This field tracks whether the member has completed the discovery step

-- Add discovery_completed column to member_onboarding table
ALTER TABLE member_onboarding ADD COLUMN discovery_completed BOOLEAN DEFAULT FALSE;

-- Add a comment to clarify the purpose of this field
COMMENT ON COLUMN member_onboarding.discovery_completed IS 'Whether the member has completed the discovery source step in onboarding';

-- Update the member_onboarding_status view to include the new field
DROP VIEW IF EXISTS member_onboarding_status;

CREATE VIEW member_onboarding_status AS
SELECT 
    mo.id,
    mo.member_id,
    mo.personal_info_completed,
    mo.discovery_completed,
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
