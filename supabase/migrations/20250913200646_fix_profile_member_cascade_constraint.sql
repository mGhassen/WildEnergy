-- Fix profile-member cascade constraint
-- When a profile is deleted, the member should be unlinked (profile_id set to NULL)
-- not deleted entirely

-- Drop the existing foreign key constraint
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_profile_id_fkey;

-- Recreate the constraint with SET NULL instead of CASCADE
-- This means when a profile is deleted, the member's profile_id will be set to NULL
-- but the member record will remain
ALTER TABLE members 
ADD CONSTRAINT members_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;
