ALTER TABLE class_registrations
ADD COLUMN subscription_id INTEGER REFERENCES subscriptions(id); 