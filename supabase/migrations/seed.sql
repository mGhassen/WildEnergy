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