-- Categories
INSERT INTO categories (name, description, color, is_active)
VALUES
  ('Yoga', 'Yoga classes for all levels', '#FFD700', true),
  ('Cardio', 'Cardio and HIIT classes', '#FF6347', true),
  ('Strength', 'Strength and conditioning', '#4682B4', true),
  ('Pilates', 'Pilates and flexibility', '#8A2BE2', true);

-- Classes
INSERT INTO classes (name, description, category_id, duration, max_capacity, equipment, is_active, created_at, updated_at)
VALUES
  ('Yoga Flow', 'Vinyasa yoga for all levels.', 1, 60, 18, 'Yoga mat', true, NOW(), NOW()),
  ('Cardio Blast', 'High-intensity interval training.', 2, 45, 25, NULL, true, NOW(), NOW()),
  ('Strength Circuit', 'Strength and conditioning circuit.', 3, 60, 16, 'Dumbbells', true, NOW(), NOW()),
  ('Pilates Core', 'Pilates class focused on core strength.', 4, 50, 14, 'Mat', true, NOW(), NOW());