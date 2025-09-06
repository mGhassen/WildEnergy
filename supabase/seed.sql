-- Groups (must be created first)
INSERT INTO groups (name, description, color, is_active)
VALUES
  ('Fitness Basics', 'Core fitness categories for general health', '#4ECDC4', true),
  ('Pole Dance Group', 'Pole dancing and flexibility training', '#FF1493', true),
  ('Dance & Movement', 'Various dance styles and movement', '#FF69B4', true),
  ('Combat Sports', 'Martial arts and self-defense', '#8B4513', true);

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
  ('Martial Arts', 'Self-defense and martial arts', '#8B4513', 4, true);

-- Classes
INSERT INTO classes (name, description, category_id, duration, max_capacity, equipment, is_active, created_at, updated_at)
VALUES
  ('Yoga Flow', 'Vinyasa yoga for all levels.', 1, 60, 18, 'Yoga mat', true, NOW(), NOW()),
  ('Cardio Blast', 'High-intensity interval training.', 2, 45, 25, NULL, true, NOW(), NOW()),
  ('Strength Circuit', 'Strength and conditioning circuit.', 3, 60, 16, 'Dumbbells', true, NOW(), NOW()),
  ('Pilates Core', 'Pilates class focused on core strength.', 4, 50, 14, 'Mat', true, NOW(), NOW()),
  ('Pole Dance Beginner', 'Introduction to pole dancing.', 5, 60, 12, 'Pole', true, NOW(), NOW()),
  ('Flexibility Flow', 'Deep stretching and mobility.', 6, 45, 20, 'Mat', true, NOW(), NOW()),
  ('Salsa Basics', 'Learn basic salsa steps.', 7, 60, 15, NULL, true, NOW(), NOW()),
  ('Kickboxing', 'High-energy martial arts workout.', 8, 50, 18, 'Gloves', true, NOW(), NOW());

-- Plans
INSERT INTO plans (name, description, price, duration_days, max_sessions, is_active)
VALUES
  ('Basic Monthly', 'Basic monthly plan with limited sessions', 49.99, 30, 8, true),
  ('Premium Monthly', 'Premium monthly plan with more variety', 79.99, 30, 12, true),
  ('Pole Dance Special', 'Specialized pole dance plan', 89.99, 30, 10, true),
  ('Flexibility Focus', 'Plan focused on stretching and mobility', 59.99, 30, 6, true),
  ('Mixed Fitness', 'Balanced fitness plan', 99.99, 30, 15, true);


-- Plan Groups (defining which groups and how many sessions each plan includes)
INSERT INTO plan_groups (plan_id, group_id, session_count)
VALUES
  -- Basic Monthly: 8 sessions of Fitness Basics
  (1, 1, 8),
  
  -- Premium Monthly: 12 sessions of Fitness Basics
  (2, 1, 12),
  
  -- Pole Dance Special: 10 sessions of Pole Dance Group
  (3, 2, 10),
  
  -- Flexibility Focus: 6 sessions of Pole Dance Group (includes stretching)
  (4, 2, 6),
  
  -- Mixed Fitness: 15 sessions total
  (5, 1, 12), -- 12 sessions of Fitness Basics
  (5, 3, 2),  -- 2 sessions of Dance & Movement
  (5, 4, 1);  -- 1 session of Combat Sports