#!/usr/bin/env node

/**
 * Create a single admin user on Supabase (local or remote).
 *
 * Usage:
 *   node scripts/create-admin-user.js --email admin@example.com --password secret --first-name Admin --last-name User
 *   node scripts/create-admin-user.js --remote prod --email admin@example.com --password secret --first-name Admin --last-name User
 *   node scripts/create-admin-user.js --remote dev --email admin@example.com --password secret --first-name Admin --last-name User
 *
 * --remote prod uses REMOTE_PROD_SUPABASE_URL + REMOTE_PROD_SUPABASE_SERVICE_ROLE_KEY
 * --remote dev  uses REMOTE_DEV_SUPABASE_URL + REMOTE_DEV_SUPABASE_SERVICE_ROLE_KEY
 * default/local uses NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--remote') {
      const target = argv[i + 1];
      if (target && !target.startsWith('--')) {
        args.remote = target;
        i++;
      } else {
        args.remote = 'prod';
      }
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

  if (!config.url) {
    const envName =
      target === 'prod'
        ? 'REMOTE_PROD_SUPABASE_URL'
        : target === 'dev'
          ? 'REMOTE_DEV_SUPABASE_URL'
          : 'NEXT_PUBLIC_SUPABASE_URL';
    console.error(`❌ ${envName} is required`);
    process.exit(1);
  }

  if (!config.key) {
    const envName =
      target === 'prod'
        ? 'REMOTE_PROD_SUPABASE_SERVICE_ROLE_KEY'
        : target === 'dev'
          ? 'REMOTE_DEV_SUPABASE_SERVICE_ROLE_KEY'
          : 'SUPABASE_SERVICE_ROLE_KEY';
    console.error(`❌ ${envName} is required`);
    process.exit(1);
  }

  return { supabaseUrl: config.url, serviceRoleKey: config.key, label: config.label };
}

async function findAuthUserByEmail(admin, email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function createAdminUser({ email, password, firstName, lastName, profileEmail, phone, address, profession }) {
  const args = parseArgs(process.argv);
  const target = args.remote || 'local';
  const { supabaseUrl, serviceRoleKey, label } = getConfig(target);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`🔗 Target: ${label} Supabase (${supabaseUrl})`);
  console.log(`📝 Creating admin: ${email}\n`);

  let authUserId;

  const { data: createdAuth, error: createAuthError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });

  if (createAuthError) {
    if (!createAuthError.message.toLowerCase().includes('already')) {
      throw createAuthError;
    }

    const existing = await findAuthUserByEmail(admin, email);
    if (!existing) {
      throw new Error(`Auth user exists but could not be found: ${email}`);
    }

    authUserId = existing.id;
    console.log(`ℹ️  Auth user already exists: ${email} (${authUserId})`);

    const { error: updateAuthError } = await admin.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });
    if (updateAuthError) throw updateAuthError;
  } else {
    authUserId = createdAuth.user.id;
    console.log(`✅ Auth user created: ${email} (${authUserId})`);
  }

  const { data: existingById } = await admin
    .from('accounts')
    .select('id, profile_id, status, is_admin')
    .eq('id', authUserId)
    .maybeSingle();

  const { data: existingByAuthUserId } = await admin
    .from('accounts')
    .select('id, profile_id, status, is_admin')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  const { data: existingByEmail } = await admin
    .from('accounts')
    .select('id, profile_id, status, is_admin')
    .eq('email', email)
    .maybeSingle();

  const existingAccount = existingById || existingByAuthUserId || existingByEmail;

  if (existingAccount) {
    console.log(
      `ℹ️  Existing account found: ${existingAccount.id} (status=${existingAccount.status}, is_admin=${existingAccount.is_admin})`
    );
  }

  let profileId = existingAccount?.profile_id ?? null;

  if (!profileId) {
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .insert({
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        profile_email: profileEmail || email,
        address: address || null,
        profession: profession || 'Administrator',
      })
      .select('id')
      .single();

    if (profileError) throw profileError;
    profileId = profile.id;
    console.log(`✅ Profile created: ${profileId}`);
  } else {
    const { error: profileUpdateError } = await admin
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        profile_email: profileEmail || email,
        address: address || null,
        profession: profession || 'Administrator',
      })
      .eq('id', profileId);

    if (profileUpdateError) throw profileUpdateError;
    console.log(`ℹ️  Profile updated: ${profileId}`);
  }

  const accountId = existingAccount?.id ?? authUserId;

  if (existingAccount) {
    const { error: accountUpdateError } = await admin
      .from('accounts')
      .update({
        email,
        status: 'active',
        is_admin: true,
        profile_id: profileId,
        auth_user_id: authUserId,
      })
      .eq('id', accountId);

    if (accountUpdateError) throw accountUpdateError;
    console.log(`✅ Account promoted to admin: ${accountId}`);
  } else {
    const { error: accountError } = await admin.from('accounts').insert({
      id: authUserId,
      auth_user_id: authUserId,
      email,
      status: 'active',
      is_admin: true,
      profile_id: profileId,
    });

    if (accountError) throw accountError;
    console.log(`✅ Account created: ${authUserId}`);
  }

  const { data: userProfile, error: verifyError } = await admin
    .from('user_profiles')
    .select('account_id, account_status, is_admin, user_type, accessible_portals')
    .eq('email', email)
    .single();

  if (verifyError) {
    throw new Error(`Account created but verification failed: ${verifyError.message}`);
  }

  if (userProfile.account_status !== 'active') {
    throw new Error(
      `Account status is "${userProfile.account_status}" — must be "active" for admin access`
    );
  }

  if (!userProfile.is_admin) {
    throw new Error('Account is_admin is false after update');
  }

  if (!userProfile.accessible_portals?.includes('admin')) {
    throw new Error(
      `accessible_portals=${JSON.stringify(userProfile.accessible_portals)} — expected to include "admin"`
    );
  }

  console.log('\n🎉 Admin user ready');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Status: ${userProfile.account_status}`);
  console.log(`Portals: ${userProfile.accessible_portals.join(', ')}`);
}

const args = parseArgs(process.argv);
const email = args.email || process.env.ADMIN_EMAIL;
const password = args.password || process.env.ADMIN_PASSWORD;
const firstName = args.first_name || process.env.ADMIN_FIRST_NAME || 'Admin';
const lastName = args.last_name || process.env.ADMIN_LAST_NAME || 'User';

if (!email || !password) {
  console.error('❌ --email and --password are required (or set ADMIN_EMAIL / ADMIN_PASSWORD)');
  console.error('\nExample:');
  console.error(
    '  node scripts/create-admin-user.js --remote prod --email admin@wildenergy.gym --password your-secure-password --first-name Admin --last-name User'
  );
  process.exit(1);
}

createAdminUser({
  email,
  password,
  firstName,
  lastName,
  profileEmail: args.profile_email,
  phone: args.phone,
  address: args.address,
  profession: args.profession,
}).catch((error) => {
  console.error(`❌ Failed: ${error.message}`);
  process.exit(1);
});
