-- Allow the same group to appear in multiple shared pools on one plan.
-- Keep UNIQUE(pool_id, group_id) so a pool itself has no duplicate groups.
-- Dedicated vs shared exclusivity trigger is unchanged.

ALTER TABLE plan_session_pool_groups
  DROP CONSTRAINT IF EXISTS plan_session_pool_groups_plan_group_unique;

COMMENT ON TABLE plan_session_pool_groups IS
  'Groups included in a shared session pool. UNIQUE(pool_id, group_id) prevents duplicates within a pool; the same group may belong to multiple pools on one plan.';
