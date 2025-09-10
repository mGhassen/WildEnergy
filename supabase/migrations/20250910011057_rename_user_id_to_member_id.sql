-- Migration: Rename user_id columns back to member_id for clarity
-- This migration renames the user_id columns to member_id to make it clear they reference members, not users

-- 1. Drop foreign key constraints first
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE class_registrations DROP CONSTRAINT IF EXISTS class_registrations_user_id_fkey;
ALTER TABLE checkins DROP CONSTRAINT IF EXISTS checkins_user_id_fkey;

-- 2. Rename columns from user_id to member_id
ALTER TABLE subscriptions RENAME COLUMN user_id TO member_id;
ALTER TABLE class_registrations RENAME COLUMN user_id TO member_id;
ALTER TABLE checkins RENAME COLUMN user_id TO member_id;

-- 3. Recreate foreign key constraints with member_id (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_member_id_fkey') THEN
        ALTER TABLE subscriptions 
        ADD CONSTRAINT subscriptions_member_id_fkey 
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_registrations_member_id_fkey') THEN
        ALTER TABLE class_registrations 
        ADD CONSTRAINT class_registrations_member_id_fkey 
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checkins_member_id_fkey') THEN
        ALTER TABLE checkins 
        ADD CONSTRAINT checkins_member_id_fkey 
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Update indexes to use member_id
DROP INDEX IF EXISTS idx_subscriptions_member_id;
DROP INDEX IF EXISTS idx_class_registrations_member_id;
DROP INDEX IF EXISTS idx_checkins_member_id;

CREATE INDEX idx_subscriptions_member_id ON subscriptions(member_id);
CREATE INDEX idx_class_registrations_member_id ON class_registrations(member_id);
CREATE INDEX idx_checkins_member_id ON checkins(member_id);
