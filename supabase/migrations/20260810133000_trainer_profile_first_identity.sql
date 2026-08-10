-- Profile-first identity for trainers (mirror members).
-- Safe for production: no row deletes, no data rewrites of person fields.
-- Existing linked trainers keep their account_id; new trainers may have account_id NULL.

-- 1) Account delete must not wipe the trainer role (same as members).
ALTER TABLE trainers
  DROP CONSTRAINT IF EXISTS trainers_account_id_fkey;

ALTER TABLE trainers
  ADD CONSTRAINT trainers_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN trainers.account_id IS
  'Optional login account. NULL = trainer without account. Same person is profiles.id.';

COMMENT ON COLUMN trainers.profile_id IS
  'Person identity. Member + trainer roles for the same person share this profile.';

COMMENT ON COLUMN members.profile_id IS
  'Person identity. Member + trainer roles for the same person share this profile.';

-- 2) One trainer role per profile / account (skip if duplicates already exist).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM trainers
    WHERE profile_id IS NOT NULL
    GROUP BY profile_id
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS trainers_profile_id_unique
      ON trainers(profile_id)
      WHERE profile_id IS NOT NULL;
  ELSE
    RAISE NOTICE 'Skipped trainers_profile_id_unique: duplicate profile_id rows exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM trainers
    WHERE account_id IS NOT NULL
    GROUP BY account_id
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS trainers_account_id_unique
      ON trainers(account_id)
      WHERE account_id IS NOT NULL;
  ELSE
    RAISE NOTICE 'Skipped trainers_account_id_unique: duplicate account_id rows exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM members
    WHERE profile_id IS NOT NULL
    GROUP BY profile_id
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS members_profile_id_unique
      ON members(profile_id)
      WHERE profile_id IS NOT NULL;
  ELSE
    RAISE NOTICE 'Skipped members_profile_id_unique: duplicate profile_id rows exist';
  END IF;
END $$;

-- 3) Expose profile_id on user_profiles (person identity for linked accounts).
DROP VIEW IF EXISTS user_profiles;

CREATE VIEW user_profiles AS
SELECT
    a.id AS account_id,
    a.email AS email,
    a.email AS account_email,
    a.status AS account_status,
    COALESCE(a.last_login, au.last_sign_in_at) AS last_login,
    a.is_admin,
    a.created_at,
    au.email_confirmed_at AS confirmed_at,
    p.id AS profile_id,
    p.first_name,
    p.last_name,
    p.phone,
    p.profile_email,
    p.date_of_birth,
    p.address,
    p.profession,
    p.emergency_contact_name,
    p.emergency_contact_phone,
    p.profile_image_url,
    m.id AS member_id,
    m.member_notes,
    CASE
        WHEN m.id IS NULL THEN NULL
        ELSE get_member_credit_balance(m.id)
    END AS credit,
    m.status AS member_status,
    m.is_blacklisted,
    m.guest_count,
    t.id AS trainer_id,
    t.specialization,
    t.experience_years,
    t.bio,
    t.certification,
    t.hourly_rate,
    t.status AS trainer_status,
    CASE
        WHEN a.is_admin = true AND t.id IS NOT NULL AND m.id IS NOT NULL THEN 'admin_member_trainer'
        WHEN a.is_admin = true AND t.id IS NOT NULL THEN 'admin_trainer'
        WHEN a.is_admin = true AND m.id IS NOT NULL THEN 'admin_member'
        WHEN a.is_admin = true THEN 'admin'
        WHEN t.id IS NOT NULL AND m.id IS NOT NULL THEN 'member_trainer'
        WHEN t.id IS NOT NULL THEN 'trainer'
        WHEN m.id IS NOT NULL THEN 'member'
        ELSE 'account_only'
    END AS user_type,
    get_user_portals(a.id) AS accessible_portals
FROM accounts a
LEFT JOIN auth.users au ON au.id::text = a.auth_user_id
LEFT JOIN profiles p ON a.profile_id = p.id
LEFT JOIN members m ON a.id = m.account_id
LEFT JOIN trainers t ON a.id = t.account_id;

COMMENT ON VIEW user_profiles IS
  'Account-rooted join. Unlinked members/trainers are not in this view; use role tables + profiles.';
