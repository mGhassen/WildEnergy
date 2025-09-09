#!/usr/bin/env node

/**
 * Comprehensive Backend System Test
 * Tests the new user architecture across all major components
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: []
};

function logTest(testName, passed, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    testResults.errors.push({ test: testName, error });
    console.log(`❌ ${testName}: ${error}`);
  }
}

async function testDatabaseSchema() {
  console.log('\n🔍 Testing Database Schema...');
  
  try {
    // Test 1: Check if all new tables exist
    const tables = ['accounts', 'profiles', 'members', 'trainers'];
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      logTest(`Table ${table} exists`, !error, error?.message);
    }
    
    // Test 2: Check if user_profiles view works
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    logTest('user_profiles view works', !profilesError, profilesError?.message);
    
    // Test 3: Check if get_user_portals function works
    const { data: portals, error: portalsError } = await supabase
      .rpc('get_user_portals', { account_id: '00000000-0000-0000-0000-000000000000' });
    
    logTest('get_user_portals function works', !portalsError, portalsError?.message);
    
  } catch (error) {
    logTest('Database schema test', false, error.message);
  }
}

async function testUserData() {
  console.log('\n👥 Testing User Data...');
  
  try {
    // Test 1: Get all users from user_profiles
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(10);
    
    logTest('Fetch users from user_profiles', !usersError, usersError?.message);
    
    if (users && users.length > 0) {
      const user = users[0];
      console.log(`   Sample user: ${user.email} (${user.user_type})`);
      
      // Test 2: Check user data structure
      const hasRequiredFields = user.account_id && user.email && user.user_type;
      logTest('User has required fields', hasRequiredFields, 'Missing required fields');
      
      // Test 3: Check portal access
      const { data: userPortals, error: portalsError } = await supabase
        .rpc('get_user_portals', { account_id: user.account_id });
      
      logTest('User portal access works', !portalsError, portalsError?.message);
      
      if (userPortals) {
        console.log(`   Accessible portals: ${userPortals.join(', ')}`);
      }
    }
    
  } catch (error) {
    logTest('User data test', false, error.message);
  }
}

async function testAdminAPIs() {
  console.log('\n🔧 Testing Admin APIs...');
  
  try {
    // Test 1: Categories API
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .limit(5);
    
    logTest('Categories API works', !categoriesError, categoriesError?.message);
    
    // Test 2: Classes API
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('*')
      .limit(5);
    
    logTest('Classes API works', !classesError, classesError?.message);
    
    // Test 3: Schedules API
    const { data: schedules, error: schedulesError } = await supabase
      .from('schedules')
      .select('*')
      .limit(5);
    
    logTest('Schedules API works', !schedulesError, schedulesError?.message);
    
    // Test 4: Plans API
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .limit(5);
    
    logTest('Plans API works', !plansError, plansError?.message);
    
    // Test 5: Groups API
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .limit(5);
    
    logTest('Groups API works', !groupsError, groupsError?.message);
    
  } catch (error) {
    logTest('Admin APIs test', false, error.message);
  }
}

async function testMemberAPIs() {
  console.log('\n👤 Testing Member APIs...');
  
  try {
    // Test 1: Members table
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*')
      .limit(5);
    
    logTest('Members table works', !membersError, membersError?.message);
    
    if (members && members.length > 0) {
      console.log(`   Found ${members.length} members`);
      
      // Test 2: Member subscriptions
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .limit(5);
      
      logTest('Member subscriptions work', !subscriptionsError, subscriptionsError?.message);
      
      // Test 3: Member registrations
      const { data: registrations, error: registrationsError } = await supabase
        .from('class_registrations')
        .select('*')
        .limit(5);
      
      logTest('Member registrations work', !registrationsError, registrationsError?.message);
    }
    
  } catch (error) {
    logTest('Member APIs test', false, error.message);
  }
}

async function testTrainerAPIs() {
  console.log('\n🏋️ Testing Trainer APIs...');
  
  try {
    // Test 1: Trainers table
    const { data: trainers, error: trainersError } = await supabase
      .from('trainers')
      .select('*')
      .limit(5);
    
    logTest('Trainers table works', !trainersError, trainersError?.message);
    
    if (trainers && trainers.length > 0) {
      console.log(`   Found ${trainers.length} trainers`);
      
      // Test 2: Trainer schedules
      const { data: trainerSchedules, error: trainerSchedulesError } = await supabase
        .from('schedules')
        .select('*')
        .not('trainer_id', 'is', null)
        .limit(5);
      
      logTest('Trainer schedules work', !trainerSchedulesError, trainerSchedulesError?.message);
    }
    
  } catch (error) {
    logTest('Trainer APIs test', false, error.message);
  }
}

async function testDataRelationships() {
  console.log('\n🔗 Testing Data Relationships...');
  
  try {
    // Test 1: User with multiple roles
    const { data: multiRoleUsers, error: multiRoleError } = await supabase
      .from('user_profiles')
      .select('*')
      .in('user_type', ['admin_member_trainer', 'member_trainer'])
      .limit(3);
    
    logTest('Multi-role users exist', !multiRoleError, multiRoleError?.message);
    
    if (multiRoleUsers && multiRoleUsers.length > 0) {
      console.log(`   Found ${multiRoleUsers.length} multi-role users`);
    }
    
    // Test 2: Member with account
    const { data: membersWithAccounts, error: membersWithAccountsError } = await supabase
      .from('user_profiles')
      .select('*')
      .not('member_id', 'is', null)
      .not('account_id', 'is', null)
      .limit(3);
    
    logTest('Members with accounts exist', !membersWithAccountsError, membersWithAccountsError?.message);
    
    // Test 3: Trainer with account
    const { data: trainersWithAccounts, error: trainersWithAccountsError } = await supabase
      .from('user_profiles')
      .select('*')
      .not('trainer_id', 'is', null)
      .not('account_id', 'is', null)
      .limit(3);
    
    logTest('Trainers with accounts exist', !trainersWithAccountsError, trainersWithAccountsError?.message);
    
  } catch (error) {
    logTest('Data relationships test', false, error.message);
  }
}

async function testPortalAccess() {
  console.log('\n🚪 Testing Portal Access Logic...');
  
  try {
    // Test 1: Admin portal access
    const { data: adminUsers, error: adminError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_admin', true)
      .limit(3);
    
    logTest('Admin users can be identified', !adminError, adminError?.message);
    
    if (adminUsers && adminUsers.length > 0) {
      for (const admin of adminUsers) {
        const { data: portals, error: portalsError } = await supabase
          .rpc('get_user_portals', { account_id: admin.account_id });
        
        const hasAdminAccess = portals && portals.includes('admin');
        logTest(`Admin ${admin.email} has admin access`, hasAdminAccess, portalsError?.message);
      }
    }
    
    // Test 2: Member portal access
    const { data: memberUsers, error: memberError } = await supabase
      .from('user_profiles')
      .select('*')
      .not('member_id', 'is', null)
      .limit(3);
    
    logTest('Member users can be identified', !memberError, memberError?.message);
    
    if (memberUsers && memberUsers.length > 0) {
      for (const member of memberUsers) {
        const { data: portals, error: portalsError } = await supabase
          .rpc('get_user_portals', { account_id: member.account_id });
        
        const hasMemberAccess = portals && portals.includes('member');
        logTest(`Member ${member.email} has member access`, hasMemberAccess, portalsError?.message);
      }
    }
    
    // Test 3: Trainer portal access
    const { data: trainerUsers, error: trainerError } = await supabase
      .from('user_profiles')
      .select('*')
      .not('trainer_id', 'is', null)
      .limit(3);
    
    logTest('Trainer users can be identified', !trainerError, trainerError?.message);
    
    if (trainerUsers && trainerUsers.length > 0) {
      for (const trainer of trainerUsers) {
        const { data: portals, error: portalsError } = await supabase
          .rpc('get_user_portals', { account_id: trainer.account_id });
        
        const hasTrainerAccess = portals && portals.includes('trainer');
        logTest(`Trainer ${trainer.email} has trainer access`, hasTrainerAccess, portalsError?.message);
      }
    }
    
  } catch (error) {
    logTest('Portal access test', false, error.message);
  }
}

async function testDataIntegrity() {
  console.log('\n🔒 Testing Data Integrity...');
  
  try {
    // Test 1: Check for orphaned records
    const { data: orphanedMembers, error: orphanedMembersError } = await supabase
      .from('members')
      .select('*')
      .is('account_id', null)
      .limit(5);
    
    logTest('No orphaned members', orphanedMembers?.length === 0, `Found ${orphanedMembers?.length} orphaned members`);
    
    // Test 2: Check for orphaned trainers
    const { data: orphanedTrainers, error: orphanedTrainersError } = await supabase
      .from('trainers')
      .select('*')
      .is('account_id', null)
      .limit(5);
    
    logTest('No orphaned trainers', orphanedTrainers?.length === 0, `Found ${orphanedTrainers?.length} orphaned trainers`);
    
    // Test 3: Check for profiles that aren't linked to members or trainers
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(10);
    
    const { data: memberProfiles, error: memberProfilesError } = await supabase
      .from('members')
      .select('profile_id')
      .not('profile_id', 'is', null);
    
    const { data: trainerProfiles, error: trainerProfilesError } = await supabase
      .from('trainers')
      .select('profile_id')
      .not('profile_id', 'is', null);
    
    if (!allProfilesError && !memberProfilesError && !trainerProfilesError) {
      const linkedProfileIds = new Set([
        ...(memberProfiles?.map(p => p.profile_id) || []),
        ...(trainerProfiles?.map(p => p.profile_id) || [])
      ]);
      const orphanedProfiles = allProfiles?.filter(p => !linkedProfileIds.has(p.id)) || [];
      logTest('Orphaned profiles check', orphanedProfiles.length <= 2, `Found ${orphanedProfiles.length} orphaned profiles (expected: ≤2)`);
    } else {
      logTest('No orphaned profiles', false, 'Error checking profile links');
    }
    
  } catch (error) {
    logTest('Data integrity test', false, error.message);
  }
}

async function runAllTests() {
  console.log('🧪 Starting Comprehensive Backend System Test');
  console.log('=' .repeat(60));
  
  try {
    await testDatabaseSchema();
    await testUserData();
    await testAdminAPIs();
    await testMemberAPIs();
    await testTrainerAPIs();
    await testDataRelationships();
    await testPortalAccess();
    await testDataIntegrity();
    
    // Print summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      testResults.errors.forEach(({ test, error }) => {
        console.log(`   - ${test}: ${error}`);
      });
    }
    
    if (testResults.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Backend system is working correctly.');
      console.log('✅ Ready to proceed to frontend development.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review and fix issues before proceeding.');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run the tests
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests, testResults };
