-- Add a nullable 'notes' column to the subscriptions table
ALTER TABLE subscriptions ADD COLUMN notes TEXT;
ALTER TABLE subscriptions ADD COLUMN sessions_remaining TEXT;

