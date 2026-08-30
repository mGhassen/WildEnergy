#!/usr/bin/env node
/**
 * Reconcile ALL subscription pool/group balances from class_registrations.
 *
 * Usage (prod):
 *   REMOTE_PROD_SUPABASE_URL=https://xxx.supabase.co \
 *   REMOTE_PROD_SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/reconcile-all-subscriptions.mjs
 *
 * Or with .env uncommented for prod SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 */

import { createClient } from '@supabase/supabase-js';

const url =
  process.env.REMOTE_PROD_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.REMOTE_PROD_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing REMOTE_PROD_SUPABASE_URL / REMOTE_PROD_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: subs, error: listError } = await supabase
  .from('subscriptions')
  .select('id')
  .order('id');

if (listError) {
  console.error('Failed to list subscriptions:', listError.message);
  process.exit(1);
}

console.log(`Reconciling ${subs?.length ?? 0} subscriptions on ${url}...`);

let ok = 0;
let fail = 0;

for (const { id } of subs || []) {
  const { data, error } = await supabase.rpc('reconcile_subscription_sessions', {
    p_subscription_id: id,
    p_fix_registrations: true,
  });

  if (error) {
    fail++;
    console.error(`sub ${id} ERROR:`, error.message);
    continue;
  }

  if (!data?.success) {
    fail++;
    console.error(`sub ${id} FAILED:`, data);
    continue;
  }

  ok++;
  const used = data.registrations_replayed ?? 0;
  const skipped = data.registrations_skipped ?? 0;
  if (used > 0 || skipped > 0) {
    console.log(`sub ${id}: replayed=${used} skipped=${skipped} retagged=${data.registrations_retagged ?? 0}`);
  }
}

console.log(`\nDone: ${ok} ok, ${fail} failed`);
