-- Fix duplicate foreign key constraints that are causing relationship conflicts
-- This migration removes duplicate foreign key constraints and keeps only the correct ones

-- Drop duplicate foreign key constraints for schedules -> trainers
DO $$ 
BEGIN
    -- Check if the old constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'schedules_trainer_id_fkey' 
        AND table_name = 'schedules'
    ) THEN
        ALTER TABLE schedules DROP CONSTRAINT schedules_trainer_id_fkey;
    END IF;
END $$;

-- Drop duplicate foreign key constraints for courses -> trainers
DO $$ 
BEGIN
    -- Check if the old constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'courses_trainer_id_fkey' 
        AND table_name = 'courses'
    ) THEN
        ALTER TABLE courses DROP CONSTRAINT courses_trainer_id_fkey;
    END IF;
END $$;

-- Ensure the correct foreign key constraints exist
-- These should reference the new trainers table structure

-- Verify schedules -> trainers relationship
DO $$ 
BEGIN
    -- Check if the correct constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'schedules_trainer_id_new_fkey' 
        AND table_name = 'schedules'
    ) THEN
        -- Add the constraint if it doesn't exist
        ALTER TABLE schedules 
        ADD CONSTRAINT schedules_trainer_id_new_fkey 
        FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Verify courses -> trainers relationship
DO $$ 
BEGIN
    -- Check if the correct constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'courses_trainer_id_new_fkey' 
        AND table_name = 'courses'
    ) THEN
        -- Add the constraint if it doesn't exist
        ALTER TABLE courses 
        ADD CONSTRAINT courses_trainer_id_new_fkey 
        FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Update any remaining references to use the correct foreign key names
-- This ensures that Supabase PostgREST can properly resolve relationships

-- Add comments to clarify the relationships
COMMENT ON CONSTRAINT schedules_trainer_id_new_fkey ON schedules IS 'References trainers table with new user system';
COMMENT ON CONSTRAINT courses_trainer_id_new_fkey ON courses IS 'References trainers table with new user system';
