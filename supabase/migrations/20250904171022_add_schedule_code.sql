-- Migration: Add code field to schedules table

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS code TEXT;
-- Create index for better performance on code lookups
CREATE INDEX IF NOT EXISTS idx_schedules_code ON schedules(code);
-- Generate codes for existing schedules if any
UPDATE schedules 
SET code = 'SCH-' || LPAD(id::text, 4, '0')
WHERE code IS NULL;
-- Add unique constraint after populating codes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'schedules_code_unique'
    ) THEN
        ALTER TABLE schedules ADD CONSTRAINT schedules_code_unique UNIQUE (code);
    END IF;
END $$;
-- Add comment to explain the field purpose
COMMENT ON COLUMN schedules.code IS 'Unique identifier code for the schedule (e.g., SCH-0001)';