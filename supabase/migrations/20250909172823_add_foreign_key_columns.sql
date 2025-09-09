-- Migration: Add foreign key columns to existing tables
-- This migration adds new foreign key columns to link existing tables to the new user system

-- 1. Add new foreign key columns to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN member_id UUID REFERENCES members(id) ON DELETE CASCADE;

-- 2. Add new foreign key columns to class_registrations table
ALTER TABLE class_registrations 
ADD COLUMN member_id UUID REFERENCES members(id) ON DELETE CASCADE;

-- 3. Add new foreign key columns to checkins table
ALTER TABLE checkins 
ADD COLUMN member_id UUID REFERENCES members(id) ON DELETE CASCADE;

-- 4. Add new foreign key columns to schedules table
ALTER TABLE schedules 
ADD COLUMN trainer_id_new UUID REFERENCES trainers(id) ON DELETE SET NULL;

-- 5. Add new foreign key columns to courses table (classes table doesn't have trainer_id anymore)
ALTER TABLE courses 
ADD COLUMN trainer_id_new UUID REFERENCES trainers(id) ON DELETE SET NULL;

-- 6. Create indexes for the new foreign key columns
CREATE INDEX idx_subscriptions_member_id ON subscriptions(member_id);
CREATE INDEX idx_class_registrations_member_id ON class_registrations(member_id);
CREATE INDEX idx_checkins_member_id ON checkins(member_id);
CREATE INDEX idx_schedules_trainer_id_new ON schedules(trainer_id_new);
CREATE INDEX idx_courses_trainer_id_new ON courses(trainer_id_new);

-- 7. Add temporary columns to track migration status
ALTER TABLE users ADD COLUMN migration_account_id UUID;
ALTER TABLE users ADD COLUMN migration_profile_id UUID;
ALTER TABLE users ADD COLUMN migration_member_id UUID;
ALTER TABLE users ADD COLUMN migration_trainer_id UUID;
