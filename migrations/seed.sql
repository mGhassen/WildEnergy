-- Admin user
INSERT INTO users (
  id, auth_user_id, email,
  first_name,
  last_name,
  phone,
  date_of_birth,
  is_admin,
  is_member,
  status,
  subscription_status,
  profile_image_url,
  member_notes,
  created_at,
  updated_at
) VALUES (
  '276f7266-b7ec-4439-89c0-7cd8de814802',
  'cbad0f29-d520-4c51-8c63-d25bba131d40',
  'admin@wildenergy.gym',
  'Admin',
  'User',
  NULL,
  NULL,
  true,
  false,
  'active',
  'inactive',
  NULL,
  NULL,
  '2025-06-29T14:48:25.277Z',
  '2025-06-29T14:48:25.277Z'
);

-- Member user
INSERT INTO users (
  id,
  auth_user_id,
  email,
  first_name,
  last_name,
  phone,
  date_of_birth,
  is_admin,
  is_member,
  status,
  subscription_status,
  profile_image_url,
  member_notes,
  created_at,
  updated_at
) VALUES (
  '48434470-11a7-4a3c-8810-4b6bc8d7a37c',
  '4853406c-317d-4307-b628-71becb75a297',
  'member@wildenergy.gym',
  'Member',
  'User',
  NULL,
  NULL,
  false,
  true,
  'active',
  'inactive',
  NULL,
  NULL,
  '2025-06-29T14:48:25.277Z',
  '2025-06-29T14:48:25.277Z'
);

-- Categories
INSERT INTO categories (name, description, color, is_active)
VALUES
  ('Yoga', 'Yoga classes for all levels', '#FFD700', true),
  ('Cardio', 'Cardio and HIIT classes', '#FF6347', true),
  ('Strength', 'Strength and conditioning', '#4682B4', true),
  ('Pilates', 'Pilates and flexibility', '#8A2BE2', true);

INSERT INTO classes (name, description, category_id, duration, max_capacity, equipment, is_active, created_at, updated_at)
VALUES
  ('Pole Dance Beginner', 'Introductory pole dance class for beginners.', 1, 60, 12, 'Pole', true, NOW(), NOW()),
  ('Pole Dance Intermediate', 'Intermediate pole dance tricks and combos.', 1, 75, 10, 'Pole', true, NOW(), NOW()),
  ('Pole Dance Advanced', 'Advanced pole dance techniques and routines.', 1, 90, 8, 'Pole', true, NOW(), NOW()),
  ('Stretching Basics', 'Full body stretching for flexibility.', 2, 45, 20, NULL, true, NOW(), NOW()),
  ('Deep Stretch', 'Intensive stretching for splits and backbends.', 2, 60, 15, NULL, true, NOW(), NOW()),
  ('Yoga Flow', 'Vinyasa yoga for all levels.', 3, 60, 18, 'Yoga mat', true, NOW(), NOW()),
  ('Cardio Blast', 'High-intensity interval training.', 4, 45, 25, NULL, true, NOW(), NOW()),
  ('Strength Circuit', 'Strength and conditioning circuit.', 5, 60, 16, 'Dumbbells', true, NOW(), NOW()),
  ('Pilates Core', 'Pilates class focused on core strength.', 6, 50, 14, 'Mat', true, NOW(), NOW());

  