-- Migration: Add missing columns to classes table and migrate capacity to max_capacity

ALTER TABLE classes ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS max_capacity INTEGER;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS equipment TEXT;

-- Migrate data from capacity to max_capacity if needed
UPDATE classes SET max_capacity = capacity WHERE max_capacity IS NULL AND capacity IS NOT NULL; 