-- Group plan seats: multi-member access on one paid subscription (shared session balances)

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS max_seats INTEGER NOT NULL DEFAULT 1
  CONSTRAINT plans_max_seats_positive CHECK (max_seats >= 1);

COMMENT ON COLUMN plans.max_seats IS
  'Total seats including the payer. 1 = single-member plan; >1 = group plan.';

CREATE TABLE IF NOT EXISTS subscription_seats (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'member')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked')),
  invited_by_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subscription_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_seats_member_active
  ON subscription_seats (member_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscription_seats_subscription
  ON subscription_seats (subscription_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_seats_one_owner
  ON subscription_seats (subscription_id)
  WHERE role = 'owner' AND status = 'active';

CREATE TABLE IF NOT EXISTS subscription_invites (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_invites_subscription_pending
  ON subscription_invites (subscription_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_subscription_invites_token
  ON subscription_invites (token);

-- Backfill owner seats for existing subscriptions
INSERT INTO subscription_seats (subscription_id, member_id, role, status)
SELECT s.id, s.member_id, 'owner', 'active'
FROM subscriptions s
WHERE NOT EXISTS (
  SELECT 1
  FROM subscription_seats ss
  WHERE ss.subscription_id = s.id
    AND ss.role = 'owner'
)
ON CONFLICT (subscription_id, member_id) DO NOTHING;

-- Resolve a subscription the member can use (owned or active seat), optionally for a course date
CREATE OR REPLACE FUNCTION resolve_accessible_subscription(
  p_member_id UUID,
  p_course_date DATE DEFAULT NULL,
  p_subscription_id INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_subscription_id INTEGER;
BEGIN
  IF p_subscription_id IS NOT NULL THEN
    SELECT s.id INTO v_subscription_id
    FROM subscriptions s
    WHERE s.id = p_subscription_id
      AND COALESCE(s.status, '') NOT IN ('cancelled', 'completed')
      AND (
        s.member_id = p_member_id
        OR EXISTS (
          SELECT 1
          FROM subscription_seats ss
          WHERE ss.subscription_id = s.id
            AND ss.member_id = p_member_id
            AND ss.status = 'active'
        )
      )
      AND (
        p_course_date IS NULL
        OR (
          s.start_date::date <= p_course_date
          AND s.end_date::date >= p_course_date
        )
      );
    RETURN v_subscription_id;
  END IF;

  SELECT s.id INTO v_subscription_id
  FROM subscriptions s
  WHERE COALESCE(s.status, '') NOT IN ('cancelled', 'completed')
    AND (
      s.member_id = p_member_id
      OR EXISTS (
        SELECT 1
        FROM subscription_seats ss
        WHERE ss.subscription_id = s.id
          AND ss.member_id = p_member_id
          AND ss.status = 'active'
      )
    )
    AND (
      p_course_date IS NULL
      OR (
        s.start_date::date <= p_course_date
        AND s.end_date::date >= p_course_date
      )
    )
  ORDER BY s.end_date DESC
  LIMIT 1;

  RETURN v_subscription_id;
END;
$$;

CREATE OR REPLACE FUNCTION deduct_group_session(
    p_user_id UUID,
    p_course_id INTEGER,
    p_subscription_id INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_subscription_id INTEGER;
    v_course_date DATE;
    v_alloc RECORD;
    v_sessions_remaining INTEGER;
BEGIN
    SELECT c.course_date INTO v_course_date
    FROM courses c
    WHERE c.id = p_course_id;

    IF v_course_date IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Course not found'
        );
    END IF;

    v_subscription_id := resolve_accessible_subscription(p_user_id, v_course_date, p_subscription_id);

    IF v_subscription_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No subscription covering this course date'
        );
    END IF;

    SELECT * INTO v_alloc
    FROM resolve_session_allocation(v_subscription_id, p_course_id, TRUE);

    IF v_alloc IS NULL OR v_alloc.balance_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No remaining sessions for this course type'
        );
    END IF;

    IF v_alloc.source_type = 'dedicated' THEN
        UPDATE subscription_group_sessions
        SET sessions_remaining = sessions_remaining - 1,
            updated_at = NOW()
        WHERE id = v_alloc.balance_id
          AND sessions_remaining > 0
        RETURNING sessions_remaining INTO v_sessions_remaining;
    ELSE
        UPDATE subscription_pool_sessions
        SET sessions_remaining = sessions_remaining - 1,
            updated_at = NOW()
        WHERE id = v_alloc.balance_id
          AND sessions_remaining > 0
        RETURNING sessions_remaining INTO v_sessions_remaining;
    END IF;

    IF v_sessions_remaining IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No remaining sessions for this course type'
        );
    END IF;

    PERFORM complete_subscription_if_depleted(v_subscription_id);

    RETURN json_build_object(
        'success', true,
        'subscription_id', v_subscription_id,
        'group_id', v_alloc.group_id,
        'pool_id', v_alloc.pool_id,
        'source_type', v_alloc.source_type,
        'sessions_remaining', v_sessions_remaining
    );
END;
$$;

CREATE OR REPLACE FUNCTION can_register_for_course(
    p_user_id UUID,
    p_course_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_subscription_id INTEGER;
    v_course_date DATE;
    v_alloc RECORD;
BEGIN
    SELECT c.course_date INTO v_course_date
    FROM courses c
    WHERE c.id = p_course_id;

    IF v_course_date IS NULL THEN
        RETURN json_build_object(
            'can_register', false,
            'error', 'Course not found'
        );
    END IF;

    v_subscription_id := resolve_accessible_subscription(p_user_id, v_course_date, NULL);

    IF v_subscription_id IS NULL THEN
        RETURN json_build_object(
            'can_register', false,
            'error', 'No subscription covering this course date'
        );
    END IF;

    SELECT * INTO v_alloc
    FROM resolve_session_allocation(v_subscription_id, p_course_id, TRUE);

    IF v_alloc IS NULL OR v_alloc.balance_id IS NULL THEN
        RETURN json_build_object(
            'can_register', false,
            'error', 'No sessions allocated for this course type'
        );
    END IF;

    IF v_alloc.sessions_remaining <= 0 THEN
        RETURN json_build_object(
            'can_register', false,
            'error', 'No remaining sessions for this course type',
            'subscription_id', v_subscription_id
        );
    END IF;

    RETURN json_build_object(
        'can_register', true,
        'subscription_id', v_subscription_id,
        'group_id', v_alloc.group_id,
        'pool_id', v_alloc.pool_id,
        'source_type', v_alloc.source_type,
        'sessions_remaining', v_alloc.sessions_remaining
    );
END;
$$;

CREATE OR REPLACE FUNCTION refund_group_session(
    p_user_id UUID,
    p_course_id INTEGER,
    p_subscription_id INTEGER DEFAULT NULL,
    p_session_source TEXT DEFAULT NULL,
    p_group_id INTEGER DEFAULT NULL,
    p_pool_id INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_subscription_id INTEGER;
    v_alloc RECORD;
    v_sessions_remaining INTEGER;
    v_total_sessions INTEGER;
    v_source_type TEXT;
    v_group_id INTEGER;
    v_pool_id INTEGER;
    v_balance_id INTEGER;
BEGIN
    IF p_subscription_id IS NOT NULL THEN
        SELECT s.id INTO v_subscription_id
        FROM subscriptions s
        WHERE s.id = p_subscription_id
          AND (
            s.member_id = p_user_id
            OR EXISTS (
              SELECT 1
              FROM subscription_seats ss
              WHERE ss.subscription_id = s.id
                AND ss.member_id = p_user_id
                AND ss.status = 'active'
            )
            OR EXISTS (
              SELECT 1
              FROM class_registrations cr
              WHERE cr.member_id = p_user_id
                AND cr.course_id = p_course_id
                AND cr.subscription_id = s.id
            )
          );
    ELSE
        SELECT cr.subscription_id INTO v_subscription_id
        FROM class_registrations cr
        WHERE cr.member_id = p_user_id
          AND cr.course_id = p_course_id
          AND cr.subscription_id IS NOT NULL
        ORDER BY cr.registration_date DESC
        LIMIT 1;

        IF v_subscription_id IS NULL THEN
            v_subscription_id := resolve_accessible_subscription(p_user_id, NULL, NULL);
        END IF;
    END IF;

    IF v_subscription_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No subscription found'
        );
    END IF;

    IF p_session_source = 'dedicated' AND p_group_id IS NOT NULL THEN
        SELECT sgs.id, sgs.sessions_remaining, sgs.total_sessions, sgs.group_id
          INTO v_balance_id, v_sessions_remaining, v_total_sessions, v_group_id
        FROM subscription_group_sessions sgs
        WHERE sgs.subscription_id = v_subscription_id
          AND sgs.group_id = p_group_id;

        IF v_balance_id IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Tagged dedicated balance not found for refund'
            );
        END IF;

        IF v_sessions_remaining >= v_total_sessions THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Dedicated balance already at capacity — refund would be a no-op',
                'subscription_id', v_subscription_id,
                'group_id', v_group_id,
                'source_type', 'dedicated',
                'sessions_remaining', v_sessions_remaining
            );
        END IF;

        UPDATE subscription_group_sessions
        SET sessions_remaining = sessions_remaining + 1,
            updated_at = NOW()
        WHERE id = v_balance_id
        RETURNING sessions_remaining INTO v_sessions_remaining;

        PERFORM reactivate_subscription_if_completed(v_subscription_id);

        RETURN json_build_object(
            'success', true,
            'subscription_id', v_subscription_id,
            'group_id', v_group_id,
            'pool_id', NULL,
            'source_type', 'dedicated',
            'sessions_remaining', v_sessions_remaining
        );
    END IF;

    IF p_session_source = 'pool' AND p_pool_id IS NOT NULL THEN
        SELECT sps.id, sps.sessions_remaining, sps.total_sessions, sps.pool_id
          INTO v_balance_id, v_sessions_remaining, v_total_sessions, v_pool_id
        FROM subscription_pool_sessions sps
        WHERE sps.subscription_id = v_subscription_id
          AND sps.pool_id = p_pool_id;

        IF v_balance_id IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Tagged pool balance not found for refund'
            );
        END IF;

        IF v_sessions_remaining >= v_total_sessions THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Pool balance already at capacity — refund would be a no-op',
                'subscription_id', v_subscription_id,
                'pool_id', v_pool_id,
                'source_type', 'pool',
                'sessions_remaining', v_sessions_remaining
            );
        END IF;

        UPDATE subscription_pool_sessions
        SET sessions_remaining = sessions_remaining + 1,
            updated_at = NOW()
        WHERE id = v_balance_id
        RETURNING sessions_remaining INTO v_sessions_remaining;

        PERFORM reactivate_subscription_if_completed(v_subscription_id);

        RETURN json_build_object(
            'success', true,
            'subscription_id', v_subscription_id,
            'group_id', p_group_id,
            'pool_id', v_pool_id,
            'source_type', 'pool',
            'sessions_remaining', v_sessions_remaining
        );
    END IF;

    SELECT * INTO v_alloc
    FROM resolve_session_allocation(v_subscription_id, p_course_id, FALSE);

    IF v_alloc IS NULL OR v_alloc.balance_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No sessions allocated for this course type'
        );
    END IF;

    v_source_type := v_alloc.source_type;
    v_group_id := v_alloc.group_id;
    v_pool_id := v_alloc.pool_id;

    IF v_source_type = 'dedicated' THEN
        SELECT sessions_remaining, total_sessions
          INTO v_sessions_remaining, v_total_sessions
        FROM subscription_group_sessions
        WHERE id = v_alloc.balance_id;

        IF v_sessions_remaining >= v_total_sessions THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Dedicated balance already at capacity — refund would be a no-op',
                'subscription_id', v_subscription_id,
                'group_id', v_group_id,
                'source_type', 'dedicated',
                'sessions_remaining', v_sessions_remaining
            );
        END IF;

        UPDATE subscription_group_sessions
        SET sessions_remaining = sessions_remaining + 1,
            updated_at = NOW()
        WHERE id = v_alloc.balance_id
        RETURNING sessions_remaining INTO v_sessions_remaining;
    ELSE
        SELECT sessions_remaining, total_sessions
          INTO v_sessions_remaining, v_total_sessions
        FROM subscription_pool_sessions
        WHERE id = v_alloc.balance_id;

        IF v_sessions_remaining >= v_total_sessions THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Pool balance already at capacity — refund would be a no-op',
                'subscription_id', v_subscription_id,
                'pool_id', v_pool_id,
                'source_type', 'pool',
                'sessions_remaining', v_sessions_remaining
            );
        END IF;

        UPDATE subscription_pool_sessions
        SET sessions_remaining = sessions_remaining + 1,
            updated_at = NOW()
        WHERE id = v_alloc.balance_id
        RETURNING sessions_remaining INTO v_sessions_remaining;
    END IF;

    PERFORM reactivate_subscription_if_completed(v_subscription_id);

    RETURN json_build_object(
        'success', true,
        'subscription_id', v_subscription_id,
        'group_id', v_group_id,
        'pool_id', v_pool_id,
        'source_type', v_source_type,
        'sessions_remaining', v_sessions_remaining
    );
END;
$$;
