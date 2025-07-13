-- Migration: Update classes table to match application data model

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'beginner',
  DROP COLUMN IF EXISTS capacity,
  DROP COLUMN IF EXISTS trainer_id; 