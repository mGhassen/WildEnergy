-- Simple seed data for Wild Energy platform
-- Basic data only - users will be created via test script

-- Groups (must be created first)
INSERT INTO groups (name, description, color, is_active)
VALUES
  ('Fitness Basics', 'Core fitness categories for general health', '#4ECDC4', true),
  ('Pole Dance Group', 'Pole dancing and flexibility training', '#FF1493', true),
  ('Dance & Movement', 'Various dance styles and movement', '#FF69B4', true),
  ('Combat Sports', 'Martial arts and self-defense', '#8B4513', true),
  ('Wellness & Recovery', 'Relaxation and recovery focused activities', '#9B59B6', true);

-- Categories (with group_id references)
INSERT INTO categories (name, description, color, group_id, is_active)
VALUES
  ('Yoga', 'Yoga classes for all levels', '#FFD700', 1, true),
  ('Cardio', 'Cardio and HIIT classes', '#FF6347', 1, true),
  ('Strength', 'Strength and conditioning', '#4682B4', 1, true),
  ('Pilates', 'Pilates and flexibility', '#8A2BE2', 1, true),
  ('Pole Dance', 'Pole dancing and aerial fitness', '#FF1493', 2, true),
  ('Stretching', 'Flexibility and mobility', '#32CD32', 2, true),
  ('Dance', 'Various dance styles', '#FF69B4', 3, true),
  ('Martial Arts', 'Self-defense and martial arts', '#8B4513', 4, true),
  ('Meditation', 'Mindfulness and meditation', '#9B59B6', 5, true),
  ('Breathing', 'Breathing exercises and relaxation', '#E67E22', 5, true);

-- Plans (prices in TND)
INSERT INTO plans (name, description, price, duration_days, is_active, created_at, updated_at)
VALUES
  ('Basic Monthly', 'Basic monthly plan with limited sessions', 150.00, 30, true, NOW(), NOW()),
  ('Premium Monthly', 'Premium monthly plan with more variety', 250.00, 30, true, NOW(), NOW()),
  ('Pole Dance Special', 'Specialized pole dance plan', 280.00, 30, true, NOW(), NOW()),
  ('Flexibility Focus', 'Plan focused on stretching and mobility', 180.00, 30, true, NOW(), NOW()),
  ('Mixed Fitness', 'Balanced fitness plan', 320.00, 30, true, NOW(), NOW()),
  ('Wellness Package', 'Complete wellness and recovery plan', 200.00, 30, true, NOW(), NOW()),
  ('Drop-in Class', 'Single class access', 25.00, 1, true, NOW(), NOW()),
  ('Weekly Pass', 'One week unlimited access', 80.00, 7, true, NOW(), NOW());

-- Plan Groups (defining which groups and how many sessions each plan includes)
INSERT INTO plan_groups (plan_id, group_id, session_count, is_free, created_at, updated_at)
VALUES
  -- Basic Monthly: 8 sessions of Fitness Basics
  (1, 1, 8, false, NOW(), NOW()),
  
  -- Premium Monthly: 12 sessions of Fitness Basics + 3 sessions of Dance & Movement
  (2, 1, 12, false, NOW(), NOW()),
  (2, 3, 3, false, NOW(), NOW()),
  
  -- Pole Dance Special: 10 sessions of Pole Dance Group + 2 sessions of Wellness
  (3, 2, 10, false, NOW(), NOW()),
  (3, 5, 2, false, NOW(), NOW()),
  
  -- Flexibility Focus: 6 sessions of Pole Dance Group (includes stretching) + 4 sessions of Wellness
  (4, 2, 6, false, NOW(), NOW()),
  (4, 5, 4, false, NOW(), NOW()),
  
  -- Mixed Fitness: 15 sessions total
  (5, 1, 12, false, NOW(), NOW()), -- 12 sessions of Fitness Basics
  (5, 3, 4, false, NOW(), NOW()),  -- 4 sessions of Dance & Movement
  (5, 4, 2, false, NOW(), NOW()),  -- 2 sessions of Combat Sports
  (5, 5, 2, false, NOW(), NOW()),  -- 2 sessions of Wellness & Recovery
  
  -- Wellness Package: 8 sessions of Wellness + 4 sessions of Pole Dance Group
  (6, 5, 8, false, NOW(), NOW()),
  (6, 2, 4, false, NOW(), NOW()),
  
  -- Drop-in Class: 1 session of any group (free choice)
  (7, 1, 1, false, NOW(), NOW()),
  
  -- Weekly Pass: 6 sessions of Fitness Basics + 4 sessions of any other group
  (8, 1, 6, false, NOW(), NOW()),
  (8, 2, 2, false, NOW(), NOW()),
  (8, 3, 2, false, NOW(), NOW());