-- Add terms version tracking to member onboarding
-- This migration improves the onboarding system by linking terms acceptance to specific terms versions

-- Add terms_version_id column to member_onboarding table
ALTER TABLE member_onboarding ADD COLUMN terms_version_id UUID REFERENCES terms_and_conditions(id);

-- Add a comment to clarify the purpose of this field
COMMENT ON COLUMN member_onboarding.terms_version_id IS 'Reference to the specific terms version that the member accepted';

-- Update existing records to reference the current active terms version
-- First, get the active terms version ID
DO $$
DECLARE
    active_terms_id UUID;
BEGIN
    -- Get the ID of the currently active terms version
    SELECT id INTO active_terms_id 
    FROM terms_and_conditions 
    WHERE is_active = TRUE 
    LIMIT 1;
    
    -- Update all existing onboarding records that have terms_accepted = TRUE
    -- but don't have a terms_version_id set
    IF active_terms_id IS NOT NULL THEN
        UPDATE member_onboarding 
        SET terms_version_id = active_terms_id
        WHERE terms_accepted = TRUE 
        AND terms_version_id IS NULL;
    END IF;
END $$;

-- Update the member_onboarding_status view to include terms version information
DROP VIEW IF EXISTS member_onboarding_status;

CREATE VIEW member_onboarding_status AS
SELECT 
    mo.id,
    mo.member_id,
    mo.personal_info_completed,
    mo.physical_profile_completed,
    mo.physical_profile,
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

-- Create an index for better performance on terms_version_id lookups
CREATE INDEX IF NOT EXISTS idx_member_onboarding_terms_version ON member_onboarding(terms_version_id);

-- Add a constraint to ensure terms_version_id is set when terms_accepted is TRUE
ALTER TABLE member_onboarding 
ADD CONSTRAINT check_terms_version_when_accepted 
CHECK (
    (terms_accepted = FALSE AND terms_version_id IS NULL) OR 
    (terms_accepted = TRUE AND terms_version_id IS NOT NULL)
);
