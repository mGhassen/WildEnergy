-- Remove code column from schedules table since we generate it dynamically
ALTER TABLE schedules DROP COLUMN IF EXISTS code;
