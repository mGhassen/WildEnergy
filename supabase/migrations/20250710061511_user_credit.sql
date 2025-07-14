-- Convert sessions_remaining from TEXT to INTEGER safely
ALTER TABLE subscriptions
ALTER COLUMN sessions_remaining TYPE INTEGER
USING sessions_remaining::INTEGER;

-- Optionally, set default value
ALTER TABLE subscriptions
ALTER COLUMN sessions_remaining SET DEFAULT 0;
