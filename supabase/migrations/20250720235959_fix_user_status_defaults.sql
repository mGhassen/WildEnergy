-- Update default status for users table
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'archived';

-- Add check constraint to ensure only valid statuses are used
ALTER TABLE users ADD CONSTRAINT users_status_check 
  CHECK (status IN ('active', 'pending', 'archived', 'suspended'));

-- Update any existing 'onhold' statuses to 'archived'
UPDATE users SET status = 'archived' WHERE status = 'onhold';

-- Update any existing 'inactive' statuses to 'archived' (if they exist)
UPDATE users SET status = 'archived' WHERE status = 'inactive'; 