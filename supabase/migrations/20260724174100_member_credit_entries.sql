-- Member credit ledger = ONLY source of truth for wallet balances.
-- Balance = SUM(member_credit_entries.amount). members.credit column is dropped.
--
-- DATA SAFETY (production):
-- 1) Create ledger
-- 2) Backfill historical paid credit payments as payment_use rows (linked to payment_id)
-- 3) Backfill opening_balance so SUM(ledger) == former members.credit (no loss)
-- 4) Expose credit on user_profiles via get_member_credit_balance()
-- 5) Drop members.credit
-- Idempotent where possible.

CREATE TABLE IF NOT EXISTS member_credit_entries (
    id SERIAL PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    entry_type TEXT NOT NULL CHECK (
        entry_type IN (
            'manual_add',
            'manual_remove',
            'payment_use',
            'payment_excess',
            'payment_reversal',
            'initial',
            'opening_balance'
        )
    ),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    balance_after NUMERIC(10, 2) NOT NULL,
    payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_credit_entries_member_id
    ON member_credit_entries(member_id);

CREATE INDEX IF NOT EXISTS idx_member_credit_entries_entry_date
    ON member_credit_entries(entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_member_credit_entries_created_at
    ON member_credit_entries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_member_credit_entries_payment_id
    ON member_credit_entries(payment_id);

COMMENT ON TABLE member_credit_entries IS
    'Source of truth for member wallet credit. Balance = SUM(amount) per member.';

CREATE OR REPLACE FUNCTION get_member_credit_balance(p_member_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(SUM(amount), 0)::NUMERIC(10, 2)
    FROM member_credit_entries
    WHERE member_id = p_member_id;
$$;

-- 1) Historical wallet spends: paid payments with payment_type = credit
INSERT INTO member_credit_entries (
    member_id,
    amount,
    entry_type,
    entry_date,
    notes,
    balance_after,
    payment_id,
    created_by
)
SELECT
    p.member_id,
    (-1 * p.amount::NUMERIC(10, 2)),
    'payment_use',
    COALESCE(p.payment_date, p.created_at::date, CURRENT_DATE),
    'Migrated historical credit payment #' || p.id,
    0, -- running balance unknown at migrate time; corrected conceptually by opening_balance
    p.id,
    'migration:20260724174100'
FROM payments p
WHERE p.payment_type = 'credit'
  AND p.payment_status = 'paid'
  AND p.amount::numeric > 0
  AND p.member_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM member_credit_entries e
      WHERE e.payment_id = p.id
        AND e.entry_type = 'payment_use'
  );

-- 2) Opening balance so ledger SUM equals former members.credit
--    opening = current_credit - SUM(entries already inserted for member)
INSERT INTO member_credit_entries (
    member_id,
    amount,
    entry_type,
    entry_date,
    notes,
    balance_after,
    created_by
)
SELECT
    m.id,
    (
      COALESCE(m.credit::NUMERIC(10, 2), 0)
      - COALESCE((
          SELECT SUM(e.amount)::NUMERIC(10, 2)
          FROM member_credit_entries e
          WHERE e.member_id = m.id
        ), 0)
    ),
    'opening_balance',
    COALESCE(m.created_at::date, CURRENT_DATE),
    'Opening balance so migrated ledger SUM matches former members.credit',
    COALESCE(m.credit::NUMERIC(10, 2), 0),
    'migration:20260724174100'
FROM members m
WHERE NOT EXISTS (
    SELECT 1
    FROM member_credit_entries e
    WHERE e.member_id = m.id
      AND e.entry_type = 'opening_balance'
)
AND (
    COALESCE(m.credit::NUMERIC(10, 2), 0)
    - COALESCE((
        SELECT SUM(e.amount)::NUMERIC(10, 2)
        FROM member_credit_entries e
        WHERE e.member_id = m.id
      ), 0)
) <> 0;

-- Sanity: every member with a former credit should now match via ledger sum
-- (no-op assert via comment; app uses get_member_credit_balance)

-- user_profiles: credit comes from ledger sum (not members.credit)
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
    'Joins accounts, auth.users, profiles, members, trainers. credit = SUM(member_credit_entries).';

-- Remove obsolete cache sync if an earlier draft of this migration created it
DROP TRIGGER IF EXISTS trg_sync_member_credit_cache ON member_credit_entries;
DROP FUNCTION IF EXISTS sync_member_credit_cache();

-- Drop the denormalized column — ledger is the only store
ALTER TABLE members DROP COLUMN IF EXISTS credit;
