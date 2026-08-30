-- Reconcile all subscriptions on a plan in one DB call (avoids serverless timeout + missed subs).

CREATE OR REPLACE FUNCTION reconcile_plan_subscription_sessions(
    p_plan_id INTEGER,
    p_fix_registrations BOOLEAN DEFAULT TRUE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    v_result JSON;
    v_total INTEGER := 0;
    v_failed INTEGER := 0;
    v_failures JSONB := '[]'::JSONB;
BEGIN
    FOR r IN
        SELECT s.id
        FROM subscriptions s
        WHERE s.plan_id = p_plan_id
        ORDER BY s.id
    LOOP
        v_total := v_total + 1;

        BEGIN
            v_result := reconcile_subscription_sessions(r.id, p_fix_registrations);

            IF NOT COALESCE((v_result->>'success')::BOOLEAN, FALSE) THEN
                v_failed := v_failed + 1;
                v_failures := v_failures || jsonb_build_array(
                    jsonb_build_object(
                        'subscription_id', r.id,
                        'error', v_result->>'error'
                    )
                );
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                v_failed := v_failed + 1;
                v_failures := v_failures || jsonb_build_array(
                    jsonb_build_object(
                        'subscription_id', r.id,
                        'error', SQLERRM
                    )
                );
        END;
    END LOOP;

    RETURN json_build_object(
        'success', v_failed = 0,
        'plan_id', p_plan_id,
        'subscriptions_processed', v_total,
        'subscriptions_failed', v_failed,
        'failures', v_failures
    );
END;
$$;

COMMENT ON FUNCTION reconcile_plan_subscription_sessions(INTEGER, BOOLEAN) IS
  'Replay registrations for every subscription on a plan. Call after plan pool edits.';
