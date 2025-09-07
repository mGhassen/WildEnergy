-- Add onboarding fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profession TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;

-- Add comments for clarity
COMMENT ON COLUMN users.onboarding_completed IS 'Whether the user has completed the mandatory onboarding process';
COMMENT ON COLUMN users.age IS 'User age for onboarding';
COMMENT ON COLUMN users.profession IS 'User profession for onboarding';
COMMENT ON COLUMN users.address IS 'User address for onboarding';
COMMENT ON COLUMN users.terms_accepted IS 'Whether the user has accepted the general conditions';
COMMENT ON COLUMN users.terms_accepted_at IS 'When the user accepted the terms';
COMMENT ON COLUMN users.onboarding_completed_at IS 'When the user completed onboarding';
