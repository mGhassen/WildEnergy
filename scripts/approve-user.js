#!/usr/bin/env node

/**
 * Approve an existing user account (no delete, no recreate).
 *
 * Usage:
 *   node scripts/approve-user.js --email user@example.com
 *   node scripts/approve-user.js --remote prod --email user@example.com --admin
 *
 * --admin  also sets is_admin = true
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--remote') {
      const target = argv[i + 1];
      args.remote = target && !target.startsWith('--') ? target : 'prod';
      if (target && !target.startsWith('--')) i++;
      continue;
    }
    if (arg === '--admin') {
      args.admin = true;
      continue;
    }
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2).replace(/-/g, '_');
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      console.error(`❌ Missing value for ${arg}`);
      process.exit(1);
    }
    args[key] = value;
    i++;
  }
  return args;
}

function getConfig(target) {
  const configs = {
    prod: {
      url: process.env.REMOTE_PROD_SUPABASE_URL,
      key: process.env.REMOTE_PROD_SUPABASE_SERVICE_ROLE_KEY,
      label: 'remote prod',
    },
    dev: {
      url: process.env.REMOTE_DEV_SUPABASE_URL,
      key: process.env.REMOTE_DEV_SUPABASE_SERVICE_ROLE_KEY,
      label: 'remote dev',
    },
    local: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
      label: 'local',
    },
  };

  const config = configs[target] || configs.local;

  if (!config.url || !config.key) {
    console.error('❌ Missing Supabase URL or service role key for target:', target);
    process.exit(1);
  }

  return { supabaseUrl: config.url, serviceRoleKey: config.key, label: config.label };
}

async function findAuthUserByEmail(admin, email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function approveUser({ email, makeAdmin }) {
  const args = parseArgs(process.argv);
  const target = args.remote || 'local';
  const { supabaseUrl, serviceRoleKey, label } = getConfig(target);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`🔗 Target: ${label} (${supabaseUrl})`);
  console.log(`📝 Approving: ${email}\n`);

  const { data: account, error: accountError } = await admin
    .from('accounts')
    .select('id, email, status, is_admin, auth_user_id, profile_id')
    .eq('email', email)
    .maybeSingle();

  if (accountError) throw accountError;
  if (!account) {
    throw new Error(`No account found for ${email}`);
  }

  console.log(`Found account ${account.id}`);
  console.log(`  status: ${account.status}`);
  console.log(`  is_admin: ${account.is_admin}`);

  const authUser = await findAuthUserByEmail(admin, email);
  if (authUser) {
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(authUser.id, {
      email_confirm: true,
    });
    if (authUpdateError) throw authUpdateError;
    console.log(`✅ Auth user confirmed: ${authUser.id}`);
  } else {
    console.log('⚠️  No auth user found — account will still be approved');
  }

  const updates = { status: 'active' };
  if (makeAdmin) updates.is_admin = true;
  if (authUser?.id) updates.auth_user_id = authUser.id;

  const { error: updateError } = await admin.from('accounts').update(updates).eq('id', account.id);
  if (updateError) throw updateError;

  console.log(`✅ Account approved → active${makeAdmin ? ', is_admin=true' : ''}`);

  const { data: member } = await admin
    .from('members')
    .select('id, status')
    .eq('account_id', account.id)
    .maybeSingle();

  if (member && member.status !== 'active') {
    const { error: memberError } = await admin
      .from('members')
      .update({ status: 'active' })
      .eq('id', member.id);
    if (memberError) throw memberError;
    console.log(`✅ Member record activated: ${member.id}`);
  }

  const { data: trainer } = await admin
    .from('trainers')
    .select('id, status')
    .eq('account_id', account.id)
    .maybeSingle();

  if (trainer && trainer.status !== 'active') {
    const { error: trainerError } = await admin
      .from('trainers')
      .update({ status: 'active' })
      .eq('id', trainer.id);
    if (trainerError) throw trainerError;
    console.log(`✅ Trainer record activated: ${trainer.id}`);
  }

  const { data: profile, error: verifyError } = await admin
    .from('user_profiles')
    .select('account_status, is_admin, user_type, accessible_portals')
    .eq('email', email)
    .single();

  if (verifyError) throw verifyError;

  console.log('\n🎉 Done');
  console.log(`  status: ${profile.account_status}`);
  console.log(`  is_admin: ${profile.is_admin}`);
  console.log(`  user_type: ${profile.user_type}`);
  console.log(`  portals: ${(profile.accessible_portals || []).join(', ') || '(none)'}`);

  if (profile.account_status !== 'active') {
    throw new Error(`Still not active: ${profile.account_status}`);
  }

  if (makeAdmin && !profile.accessible_portals?.includes('admin')) {
    throw new Error('is_admin set but admin portal still missing — check DB');
  }
}

const args = parseArgs(process.argv);
const email = args.email || process.env.APPROVE_EMAIL;

if (!email) {
  console.error('❌ --email is required');
  console.error('  node scripts/approve-user.js --remote prod --email user@example.com --admin');
  process.exit(1);
}

approveUser({ email, makeAdmin: Boolean(args.admin) }).catch((error) => {
  console.error(`❌ Failed: ${error.message}`);
  process.exit(1);
});
