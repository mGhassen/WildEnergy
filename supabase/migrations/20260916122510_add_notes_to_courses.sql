-- Optional admin notes on individual course instances
ALTER TABLE courses ADD COLUMN IF NOT EXISTS notes TEXT;
