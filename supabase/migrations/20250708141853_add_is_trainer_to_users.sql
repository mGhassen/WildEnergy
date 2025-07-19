-- Add is_trainer column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_trainer BOOLEAN DEFAULT FALSE; 