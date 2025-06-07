-- Initialize database with schema and seed data for GymFlow gym management system

-- Create database tables (these will be handled by Drizzle migrations)
-- This file contains seed data for development and testing

-- Insert seed users
INSERT INTO users (username, password, role) VALUES
  ('admin', '$2b$10$K4l5Uj9lJZzO.xZL.gP.GO2mV4Kp7R3qE8yT6vN9pQ1wX7sZ5uI2K', 'admin'),
  ('member', '$2b$10$K4l5Uj9lJZzO.xZL.gP.GO2mV4Kp7R3qE8yT6vN9pQ1wX7sZ5uI2K', 'member'),
  ('trainer1', '$2b$10$K4l5Uj9lJZzO.xZL.gP.GO2mV4Kp7R3qE8yT6vN9pQ1wX7sZ5uI2K', 'member'),
  ('trainer2', '$2b$10$K4l5Uj9lJZzO.xZL.gP.GO2mV4Kp7R3qE8yT6vN9pQ1wX7sZ5uI2K', 'member'),
  ('member2', '$2b$10$K4l5Uj9lJZzO.xZL.gP.GO2mV4Kp7R3qE8yT6vN9pQ1wX7sZ5uI2K', 'member'),
  ('member3', '$2b$10$K4l5Uj9lJZzO.xZL.gP.GO2mV4Kp7R3qE8yT6vN9pQ1wX7sZ5uI2K', 'member')
ON CONFLICT (username) DO NOTHING;

-- Insert seed members
INSERT INTO members (user_id, first_name, last_name, email, phone, date_of_birth, status) VALUES
  (2, 'John', 'Smith', 'john.smith@email.com', '+1-555-0101', '1990-05-15', 'active'),
  (5, 'Emma', 'Wilson', 'emma.wilson@email.com', '+1-555-0102', '1988-08-22', 'active'),
  (6, 'Michael', 'Chen', 'michael.chen@email.com', '+1-555-0103', '1985-12-10', 'active')
ON CONFLICT (email) DO NOTHING;

-- Insert seed trainers
INSERT INTO trainers (first_name, last_name, email, phone, specialties, bio, status) VALUES
  ('Sarah', 'Johnson', 'sarah.johnson@gymflow.com', '+1-555-0201', ARRAY['HIIT', 'Strength Training', 'CrossFit'], 'Certified personal trainer with 8 years experience in high-intensity training and strength conditioning.', 'active'),
  ('Alex', 'Davis', 'alex.davis@gymflow.com', '+1-555-0202', ARRAY['Yoga', 'Pilates', 'Flexibility'], 'Yoga instructor and wellness coach specializing in mindfulness and flexibility training.', 'active'),
  ('Mike', 'Rodriguez', 'mike.rodriguez@gymflow.com', '+1-555-0203', ARRAY['Boxing', 'Cardio', 'Weight Loss'], 'Former professional boxer turned fitness coach, expert in cardio and combat sports.', 'active'),
  ('Lisa', 'Park', 'lisa.park@gymflow.com', '+1-555-0204', ARRAY['Spin', 'Cardio', 'Endurance'], 'Certified spin instructor with expertise in cardiovascular fitness and endurance training.', 'active')
ON CONFLICT (email) DO NOTHING;

-- Insert seed plans
INSERT INTO plans (name, description, price, sessions_included, duration_days, is_active) VALUES
  ('Basic Monthly', 'Perfect for beginners - access to basic classes and gym facilities', 39.99, 8, 30, true),
  ('Premium Monthly', 'Most popular plan with unlimited access to all classes and personal training sessions', 79.99, 20, 30, true),
  ('VIP Monthly', 'Ultimate experience with unlimited access, priority booking, and nutrition consultation', 129.99, 30, 30, true),
  ('Basic Yearly', 'Annual basic plan with significant savings', 399.99, 96, 365, true),
  ('Premium Yearly', 'Annual premium plan with the best value', 799.99, 240, 365, true)
ON CONFLICT DO NOTHING;

-- Insert seed classes
INSERT INTO classes (name, description, category, duration, max_capacity, is_active) VALUES
  ('HIIT Training', 'High-intensity interval training for maximum calorie burn and fitness gains', 'hiit', 45, 15, true),
  ('Morning Yoga', 'Gentle yoga flow to start your day with mindfulness and flexibility', 'yoga', 60, 20, true),
  ('Strength & Conditioning', 'Build muscle and strength with guided weight training', 'strength', 50, 12, true),
  ('Spin Class', 'High-energy indoor cycling with motivating music', 'cardio', 45, 25, true),
  ('Boxing Fundamentals', 'Learn boxing techniques while getting a great workout', 'boxing', 60, 16, true),
  ('Pilates Core', 'Strengthen your core and improve posture with Pilates', 'pilates', 45, 18, true),
  ('Evening Yoga', 'Relaxing yoga session to unwind and stretch after a long day', 'yoga', 60, 20, true),
  ('Cardio Blast', 'High-energy cardio workout to boost endurance and burn calories', 'cardio', 30, 20, true)
ON CONFLICT DO NOTHING;

-- Insert seed schedules
INSERT INTO schedules (class_id, trainer_id, day_of_week, start_time, end_time, is_active) VALUES
  -- Monday
  (1, 1, 1, '06:00', '06:45', true), -- HIIT with Sarah
  (2, 2, 1, '07:00', '08:00', true), -- Morning Yoga with Alex
  (3, 1, 1, '18:00', '18:50', true), -- Strength with Sarah
  (4, 4, 1, '19:00', '19:45', true), -- Spin with Lisa
  
  -- Tuesday
  (5, 3, 2, '06:30', '07:30', true), -- Boxing with Mike
  (6, 2, 2, '12:00', '12:45', true), -- Pilates with Alex
  (7, 2, 2, '18:30', '19:30', true), -- Evening Yoga with Alex
  
  -- Wednesday
  (1, 1, 3, '06:00', '06:45', true), -- HIIT with Sarah
  (8, 4, 3, '07:00', '07:30', true), -- Cardio Blast with Lisa
  (3, 1, 3, '18:00', '18:50', true), -- Strength with Sarah
  (4, 4, 3, '19:00', '19:45', true), -- Spin with Lisa
  
  -- Thursday
  (2, 2, 4, '07:00', '08:00', true), -- Morning Yoga with Alex
  (5, 3, 4, '18:00', '19:00', true), -- Boxing with Mike
  (6, 2, 4, '19:15', '20:00', true), -- Pilates with Alex
  
  -- Friday
  (1, 1, 5, '06:00', '06:45', true), -- HIIT with Sarah
  (8, 4, 5, '07:00', '07:30', true), -- Cardio Blast with Lisa
  (3, 1, 5, '18:00', '18:50', true), -- Strength with Sarah
  (7, 2, 5, '19:00', '20:00', true), -- Evening Yoga with Alex
  
  -- Saturday
  (2, 2, 6, '08:00', '09:00', true), -- Morning Yoga with Alex
  (1, 1, 6, '10:00', '10:45', true), -- HIIT with Sarah
  (4, 4, 6, '11:00', '11:45', true), -- Spin with Lisa
  (5, 3, 6, '16:00', '17:00', true), -- Boxing with Mike
  
  -- Sunday
  (7, 2, 0, '09:00', '10:00', true), -- Evening Yoga with Alex
  (6, 2, 0, '10:30', '11:15', true), -- Pilates with Alex
  (8, 4, 0, '17:00', '17:30', true)  -- Cardio Blast with Lisa
ON CONFLICT DO NOTHING;

-- Insert seed subscriptions
INSERT INTO subscriptions (member_id, plan_id, start_date, end_date, sessions_remaining, is_active) VALUES
  (1, 2, '2024-11-01', '2024-11-30', 12, true), -- John Smith - Premium Monthly
  (2, 3, '2024-10-15', '2024-11-14', 25, true), -- Emma Wilson - VIP Monthly
  (3, 1, '2024-11-10', '2024-12-09', 3, true)   -- Michael Chen - Basic Monthly
ON CONFLICT DO NOTHING;

-- Insert seed class registrations
INSERT INTO class_registrations (member_id, schedule_id, registration_date, qr_code, status) VALUES
  (1, 1, '2024-11-15 10:00:00', 'QR-HIIT-001-20241115', 'registered'),
  (1, 2, '2024-11-15 10:05:00', 'QR-YOGA-002-20241115', 'registered'),
  (1, 10, '2024-11-15 10:10:00', 'QR-STRENGTH-010-20241115', 'registered'),
  (2, 4, '2024-11-15 11:00:00', 'QR-SPIN-004-20241115', 'registered'),
  (2, 7, '2024-11-15 11:05:00', 'QR-YOGA-007-20241115', 'registered'),
  (3, 9, '2024-11-15 12:00:00', 'QR-CARDIO-009-20241115', 'registered')
ON CONFLICT (qr_code) DO NOTHING;

-- Insert seed check-ins (recent activity)
INSERT INTO checkins (member_id, registration_id, checkin_time, session_consumed) VALUES
  (1, 1, '2024-11-15 06:00:00', true),
  (2, 4, '2024-11-15 19:00:00', true),
  (1, 2, '2024-11-16 07:00:00', true),
  (3, 6, '2024-11-16 07:00:00', true),
  (2, 5, '2024-11-16 18:30:00', true)
ON CONFLICT DO NOTHING;

-- Update subscription sessions remaining based on check-ins
UPDATE subscriptions SET sessions_remaining = sessions_remaining - 2 WHERE member_id = 1; -- John used 2 sessions
UPDATE subscriptions SET sessions_remaining = sessions_remaining - 2 WHERE member_id = 2; -- Emma used 2 sessions  
UPDATE subscriptions SET sessions_remaining = sessions_remaining - 1 WHERE member_id = 3; -- Michael used 1 session
