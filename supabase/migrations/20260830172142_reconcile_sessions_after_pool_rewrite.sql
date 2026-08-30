-- Bulk repair after plan pool delete-and-recreate wiped subscription balances.
-- Safe to re-run: replays registrations idempotently against current plan structure.

CREATE OR REPLACE FUNCTION reconcile_all_subscription_sessions(
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
    v_skipped INTEGER := 0;
    v_failures JSONB := '[]'::JSONB;
BEGIN
    FOR r IN
        SELECT s.id
        FROM subscriptions s
        ORDER BY s.id
    LOOP
        v_total := v_total + 1;

        BEGIN
            v_result := reconcile_subscription_sessions(r.id, p_fix_registrations);

            IF COALESCE((v_result->>'success')::BOOLEAN, FALSE) THEN
                v_skipped := v_skipped + COALESCE((v_result->>'registrations_skipped')::INTEGER, 0);
            ELSE
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
        'subscriptions_processed', v_total,
        'subscriptions_failed', v_failed,
        'registrations_skipped_total', v_skipped,
        'failures', v_failures
    );
END;
$$;

COMMENT ON FUNCTION reconcile_all_subscription_sessions(BOOLEAN) IS
  'Replay registrations for every subscription to rebuild pool/group balances. Run after plan pool id churn.';

-- One-time repair (migration apply runs this once)
SELECT reconcile_all_subscription_sessions(TRUE);
