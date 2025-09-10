-- Migration: Update foreign key references to use new system
-- This migration updates all foreign key references to use the new member/trainer IDs

-- 1. Drop old foreign key constraints
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE class_registrations DROP CONSTRAINT IF EXISTS class_registrations_user_id_fkey;
ALTER TABLE checkins DROP CONSTRAINT IF EXISTS checkins_user_id_fkey;
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_trainer_id_fkey;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_trainer_id_fkey;

-- 2. Rename old columns to _old for backup
ALTER TABLE subscriptions RENAME COLUMN user_id TO user_id_old;
ALTER TABLE class_registrations RENAME COLUMN user_id TO user_id_old;
ALTER TABLE checkins RENAME COLUMN user_id TO user_id_old;
ALTER TABLE schedules RENAME COLUMN trainer_id TO trainer_id_old;
ALTER TABLE courses RENAME COLUMN trainer_id TO trainer_id_old;

-- 3. Rename new columns to replace old ones
ALTER TABLE subscriptions RENAME COLUMN member_id TO user_id;
ALTER TABLE class_registrations RENAME COLUMN member_id TO user_id;
ALTER TABLE checkins RENAME COLUMN member_id TO user_id;
ALTER TABLE schedules RENAME COLUMN trainer_id_new TO trainer_id;
ALTER TABLE courses RENAME COLUMN trainer_id_new TO trainer_id;

-- 4. Add NOT NULL constraints where appropriate
ALTER TABLE subscriptions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE class_registrations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE checkins ALTER COLUMN user_id SET NOT NULL;

-- 5. Recreate foreign key constraints with new references
ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES members(id) ON DELETE CASCADE;

ALTER TABLE class_registrations 
ADD CONSTRAINT class_registrations_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES members(id) ON DELETE CASCADE;

ALTER TABLE checkins 
ADD CONSTRAINT checkins_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES members(id) ON DELETE CASCADE;

ALTER TABLE schedules 
ADD CONSTRAINT schedules_trainer_id_fkey 
FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL;

ALTER TABLE courses 
ADD CONSTRAINT courses_trainer_id_fkey 
FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL;

-- 6. Update indexes to reflect new column names
DROP INDEX IF EXISTS idx_subscriptions_member_id;
DROP INDEX IF EXISTS idx_class_registrations_member_id;
DROP INDEX IF EXISTS idx_checkins_member_id;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_class_registrations_user_id ON class_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
-- Indexes already exist from previous migrations

-- 7. Update the user_profiles view to reflect new column names
DROP VIEW IF EXISTS user_profiles;

CREATE VIEW user_profiles AS
SELECT 
    a.id as account_id,
    a.email,
    a.status as account_status,
    a.last_login,
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
    ar.role as admin_role,
    CASE 
        WHEN ar.role IS NOT NULL AND t.id IS NOT NULL AND m.id IS NOT NULL THEN 'admin_member_trainer'
        WHEN ar.role IS NOT NULL AND t.id IS NOT NULL THEN 'admin_trainer'
        WHEN ar.role IS NOT NULL AND m.id IS NOT NULL THEN 'admin_member'
        WHEN ar.role IS NOT NULL THEN 'admin'
        WHEN t.id IS NOT NULL AND m.id IS NOT NULL THEN 'member_trainer'
        WHEN t.id IS NOT NULL THEN 'trainer'
        WHEN m.id IS NOT NULL THEN 'member'
        ELSE 'account_only'
    END as user_type,
    get_user_portals(a.id) as accessible_portals
FROM accounts a
LEFT JOIN profiles p ON a.id = p.id -- One profile per account
LEFT JOIN members m ON a.id = m.account_id
LEFT JOIN trainers t ON a.id = t.account_id
LEFT JOIN admin_roles ar ON a.id = ar.account_id;
