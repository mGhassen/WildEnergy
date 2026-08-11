-- One-off repair for member 8892be46-93ec-476f-be40-263c6a05025c
-- Context: subscription deleted while payments existed; payments cascade-deleted
-- without reversing member_credit_entries (payment_use left, payment_id SET NULL).
-- Run in Supabase SQL editor, then verify balance.

BEGIN;

-- 1) Inspect current ledger
SELECT id, amount, entry_type, payment_id, entry_date, notes, balance_after, created_at
FROM member_credit_entries
WHERE member_id = '8892be46-93ec-476f-be40-263c6a05025c'
ORDER BY entry_date ASC, created_at ASC, id ASC;

-- 2) Restore wallet credit for orphaned payment_use rows (payment gone)
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
  e.member_id,
  (-1 * e.amount), -- payment_use is negative; reverse to positive credit
  'payment_reversal',
  CURRENT_DATE,
  'Repair: restore credit after subscription delete skipped payment cleanup (orphaned entry #' || e.id || ')',
  0,
  NULL,
  'system_repair'
FROM member_credit_entries e
WHERE e.member_id = '8892be46-93ec-476f-be40-263c6a05025c'
  AND e.entry_type = 'payment_use'
  AND e.payment_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM member_credit_entries r
    WHERE r.member_id = e.member_id
      AND r.entry_type = 'payment_reversal'
      AND r.notes LIKE '%orphaned entry #' || e.id || '%'
  );

-- 3) Recompute balance_after chronologically
WITH ordered AS (
  SELECT
    id,
    SUM(amount::numeric) OVER (
      ORDER BY entry_date ASC, created_at ASC, id ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running
  FROM member_credit_entries
  WHERE member_id = '8892be46-93ec-476f-be40-263c6a05025c'
)
UPDATE member_credit_entries e
SET balance_after = o.running
FROM ordered o
WHERE e.id = o.id;

-- 4) Verify
SELECT get_member_credit_balance('8892be46-93ec-476f-be40-263c6a05025c') AS credit_balance;

SELECT id, amount, entry_type, payment_id, entry_date, notes, balance_after
FROM member_credit_entries
WHERE member_id = '8892be46-93ec-476f-be40-263c6a05025c'
ORDER BY entry_date ASC, created_at ASC, id ASC;

COMMIT;
