-- Migration: Clean up old user system
-- This migration removes the old users table and related columns after successful migration

-- 1. Drop views that depend on users table
DROP VIEW IF EXISTS members_with_subscription_status;

-- 2. Drop old foreign key constraints from users table
ALTER TABLE trainers_old DROP CONSTRAINT IF EXISTS trainers_user_id_fkey;

-- 3. Drop old columns from users table that are no longer needed
ALTER TABLE users DROP COLUMN IF EXISTS auth_user_id;
ALTER TABLE users DROP COLUMN IF EXISTS email;
ALTER TABLE users DROP COLUMN IF EXISTS first_name;
ALTER TABLE users DROP COLUMN IF EXISTS last_name;
ALTER TABLE users DROP COLUMN IF EXISTS phone;
ALTER TABLE users DROP COLUMN IF EXISTS date_of_birth;
ALTER TABLE users DROP COLUMN IF EXISTS is_admin;
ALTER TABLE users DROP COLUMN IF EXISTS is_member;
ALTER TABLE users DROP COLUMN IF EXISTS is_trainer;
ALTER TABLE users DROP COLUMN IF EXISTS status;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_status;
ALTER TABLE users DROP COLUMN IF EXISTS profile_image_url;
ALTER TABLE users DROP COLUMN IF EXISTS member_notes;
ALTER TABLE users DROP COLUMN IF EXISTS credit;

-- 4. Drop migration tracking columns
ALTER TABLE users DROP COLUMN IF EXISTS migration_account_id;
ALTER TABLE users DROP COLUMN IF EXISTS migration_profile_id;
ALTER TABLE users DROP COLUMN IF EXISTS migration_member_id;
ALTER TABLE users DROP COLUMN IF EXISTS migration_trainer_id;

-- 5. Drop old backup columns from other tables
ALTER TABLE subscriptions DROP COLUMN IF EXISTS user_id_old;
ALTER TABLE class_registrations DROP COLUMN IF EXISTS user_id_old;
ALTER TABLE checkins DROP COLUMN IF EXISTS user_id_old;
ALTER TABLE schedules DROP COLUMN IF EXISTS trainer_id_old;
ALTER TABLE courses DROP COLUMN IF EXISTS trainer_id_old;

-- 6. Drop the old users table entirely
DROP TABLE IF EXISTS users CASCADE;

-- 7. Drop the old trainers table (data has been migrated to new trainers table)
DROP TABLE IF EXISTS trainers_old CASCADE;

-- 12. Add comment to explain the new structure
COMMENT ON TABLE accounts IS 'Authentication and access control for all users';
COMMENT ON TABLE profiles IS 'Shared personal information for all person types';
COMMENT ON TABLE members IS 'Trainee-specific information and subscriptions';
COMMENT ON TABLE trainers IS 'Trainer-specific information and schedules';
COMMENT ON VIEW user_profiles IS 'Complete user information view combining all user types';
