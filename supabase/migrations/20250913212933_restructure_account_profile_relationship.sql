-- Restructure account-profile relationship
-- This migration changes the relationship from shared IDs to a foreign key relationship
-- This allows creating accounts from existing members while maintaining separate data structures

-- 1. Add profile_id column to accounts table
ALTER TABLE accounts ADD COLUMN profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Migrate existing data: set profile_id to the current account id for existing accounts
UPDATE accounts 
SET profile_id = id 
WHERE profile_id IS NULL;

-- 3. Make profile_id NOT NULL after data migration
ALTER TABLE accounts ALTER COLUMN profile_id SET NOT NULL;

-- 4. Add unique constraint to ensure one profile per account
ALTER TABLE accounts ADD CONSTRAINT accounts_profile_id_unique UNIQUE (profile_id);

-- 5. Update the user_profiles view to use the new relationship
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
LEFT JOIN profiles p ON a.profile_id = p.id -- Use foreign key relationship
LEFT JOIN members m ON a.id = m.account_id
LEFT JOIN trainers t ON a.id = t.account_id;

-- 6. Add comment to clarify the new relationship
COMMENT ON COLUMN accounts.profile_id IS 'Foreign key reference to profiles table, allowing accounts to be created from existing member profiles';
