-- Migration: Migrate user data from users table to new structure
-- This migration copies data from the existing users table to the new account-based system

-- 1. Migrate users to accounts table
INSERT INTO accounts (id, auth_user_id, email, status, last_login, created_at, updated_at)
SELECT 
    id,
    auth_user_id,
    email,
    CASE 
        WHEN status = 'onhold' THEN 'archived'
        WHEN status = 'active' THEN 'active'
        WHEN status = 'pending' THEN 'archived'
        WHEN status = 'suspended' THEN 'suspended'
        ELSE 'archived'
    END as status,
    NULL as last_login, -- We don't have this data in the old system
    created_at,
    updated_at
FROM users
WHERE auth_user_id IS NOT NULL; -- Only migrate users with auth accounts

-- 1.1. Migrate admin users to admin_roles table
INSERT INTO admin_roles (account_id, role, created_at, updated_at)
SELECT 
    id as account_id,
    CASE 
        WHEN is_admin = true THEN 'admin'
        ELSE 'manager'
    END as role,
    created_at,
    updated_at
FROM users
WHERE auth_user_id IS NOT NULL AND is_admin = true;

-- 2. Migrate user personal data to profiles table
INSERT INTO profiles (id, first_name, last_name, phone, date_of_birth, address, profession, emergency_contact_name, emergency_contact_phone, profile_image_url, created_at, updated_at)
SELECT 
    id,
    first_name,
    last_name,
    phone,
    date_of_birth,
    NULL as address, -- Not available in old system
    NULL as profession, -- Not available in old system
    NULL as emergency_contact_name, -- Not available in old system
    NULL as emergency_contact_phone, -- Not available in old system
    profile_image_url,
    created_at,
    updated_at
FROM users
WHERE first_name IS NOT NULL; -- Only migrate users with personal data

-- 3. Migrate users to members table (all users are members by default in old system)
INSERT INTO members (id, account_id, profile_id, member_notes, credit, status, subscription_status, created_at, updated_at)
SELECT 
    gen_random_uuid() as id, -- Generate new UUID for members
    u.id as account_id,
    u.id as profile_id, -- Same as account_id since we're using account_id as profile_id
    u.member_notes,
    0 as credit, -- Default credit value since column doesn't exist yet
    CASE 
        WHEN u.status = 'onhold' THEN 'inactive'
        WHEN u.status = 'active' THEN 'active'
        WHEN u.status = 'pending' THEN 'inactive'
        WHEN u.status = 'suspended' THEN 'suspended'
        ELSE 'inactive'
    END as status,
    COALESCE(u.subscription_status, 'inactive') as subscription_status,
    u.created_at,
    u.updated_at
FROM users u
WHERE u.is_member = true OR u.is_member IS NULL; -- Include all users as members

-- 4. Migrate users to trainers table (users with is_trainer = true)
INSERT INTO trainers (id, account_id, profile_id, specialization, experience_years, bio, certification, hourly_rate, status, created_at, updated_at)
SELECT 
    gen_random_uuid() as id, -- Generate new UUID for trainers
    u.id as account_id,
    u.id as profile_id, -- Same as account_id since we're using account_id as profile_id
    t.specialization,
    t.experience_years,
    t.bio,
    t.certification,
    NULL as hourly_rate, -- Not available in old system
    COALESCE(t.status, 'active') as status,
    t.created_at,
    t.updated_at
FROM users u
JOIN trainers_old t ON u.id = t.user_id
WHERE u.is_trainer = true;

-- 5. Update the migration tracking columns in users table
UPDATE users 
SET 
    migration_account_id = id,
    migration_profile_id = id,
    migration_member_id = (SELECT m.id FROM members m WHERE m.account_id = users.id),
    migration_trainer_id = (SELECT t.id FROM trainers t WHERE t.account_id = users.id)
WHERE id IN (SELECT id FROM accounts);

-- 6. Update subscriptions to use new member_id
UPDATE subscriptions 
SET member_id = u.migration_member_id
FROM users u
WHERE subscriptions.user_id = u.id 
AND u.migration_member_id IS NOT NULL;

-- 7. Update class_registrations to use new member_id
UPDATE class_registrations 
SET member_id = u.migration_member_id
FROM users u
WHERE class_registrations.user_id = u.id 
AND u.migration_member_id IS NOT NULL;

-- 8. Update checkins to use new member_id
UPDATE checkins 
SET member_id = u.migration_member_id
FROM users u
WHERE checkins.user_id = u.id 
AND u.migration_member_id IS NOT NULL;

-- 9. Update schedules to use new trainer_id
UPDATE schedules 
SET trainer_id_new = u.migration_trainer_id
FROM users u
JOIN trainers_old t ON u.id = t.user_id
WHERE schedules.trainer_id = t.id 
AND u.migration_trainer_id IS NOT NULL;

-- 10. Update courses to use new trainer_id (classes table doesn't have trainer_id anymore)
UPDATE courses 
SET trainer_id_new = u.migration_trainer_id
FROM users u
JOIN trainers_old t ON u.id = t.user_id
WHERE courses.trainer_id = t.id 
AND u.migration_trainer_id IS NOT NULL;
