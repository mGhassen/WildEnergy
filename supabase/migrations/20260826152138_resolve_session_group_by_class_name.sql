-- Resolve course session group by class name match, not arbitrary category_groups row.
-- Pole Dance (and similar) categories link to many groups; picking any/first wrongly
-- lets e.g. Pole Initiation pools cover Private Sessions classes.

CREATE OR REPLACE FUNCTION resolve_session_allocation(
    p_subscription_id INTEGER,
    p_course_id INTEGER,
    p_require_remaining BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    source_type TEXT,
    balance_id INTEGER,
    group_id INTEGER,
    pool_id INTEGER,
    sessions_remaining INTEGER,
    is_free BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_plan_id INTEGER;
BEGIN
    SELECT s.plan_id INTO v_plan_id
    FROM subscriptions s
    WHERE s.id = p_subscription_id;

    IF v_plan_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH candidate_groups AS (
        SELECT g.id AS gid
        FROM courses c
        JOIN classes cl ON c.class_id = cl.id
        JOIN category_groups cg ON cl.category_id = cg.category_id
        JOIN groups g ON cg.group_id = g.id
        WHERE c.id = p_course_id
          AND lower(trim(g.name)) = lower(trim(cl.name))
    ),
    dedicated AS (
        SELECT
            'dedicated'::TEXT AS stype,
            sgs.id AS bid,
            sgs.group_id AS gid,
            NULL::INTEGER AS pid,
            sgs.sessions_remaining AS rem,
            COALESCE(pg.is_free, FALSE) AS free
        FROM subscription_group_sessions sgs
        JOIN candidate_groups cg ON cg.gid = sgs.group_id
        LEFT JOIN plan_groups pg
          ON pg.plan_id = v_plan_id AND pg.group_id = sgs.group_id
        WHERE sgs.subscription_id = p_subscription_id
          AND (NOT p_require_remaining OR sgs.sessions_remaining > 0)
    ),
    pooled AS (
        SELECT DISTINCT ON (sps.id)
            'pool'::TEXT AS stype,
            sps.id AS bid,
            pspg.group_id AS gid,
            sps.pool_id AS pid,
            sps.sessions_remaining AS rem,
            COALESCE(psp.is_free, FALSE) AS free
        FROM subscription_pool_sessions sps
        JOIN plan_session_pools psp ON psp.id = sps.pool_id
        JOIN plan_session_pool_groups pspg ON pspg.pool_id = sps.pool_id
        JOIN candidate_groups cg ON cg.gid = pspg.group_id
        WHERE sps.subscription_id = p_subscription_id
          AND (NOT p_require_remaining OR sps.sessions_remaining > 0)
        ORDER BY sps.id, pspg.group_id
    ),
    targets AS (
        SELECT * FROM dedicated
        UNION ALL
        SELECT * FROM pooled
    )
    SELECT t.stype, t.bid, t.gid, t.pid, t.rem, t.free
    FROM targets t
    ORDER BY
        t.free DESC,
        CASE WHEN t.stype = 'dedicated' THEN 0 ELSE 1 END,
        t.bid
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION resolve_session_allocation(INTEGER, INTEGER, BOOLEAN) IS
  'Picks dedicated/pool balance for a course. Candidate groups = category groups whose name matches the class name (trim/ci).';
