#!/usr/bin/env node

/**
 * Script to create test users in WildEnergy Supabase (New User System)
 * Creates auth users and user records for the new account-based system
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
// Service role key for creating users without signup
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable is required');
  process.exit(1);
}

if (!anonKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required to create users without signup');
  process.exit(1);
}

console.log(`🔗 Using Supabase URL: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, anonKey);
// Admin client used only for creating auth users
const admin = createClient(supabaseUrl, serviceRoleKey);

// WildEnergy test users for new system
const wildEnergyTestUsers = [
  // Admin users
  {
    email: 'admin@wildenergy.gym',
    password: 'password123',
    firstName: 'Admin',
    lastName: 'User',
    isAdmin: true,
    profileEmail: 'admin.contact@wildenergy.gym',
    status: 'active',
    phone: '+216 20 123 456',
    address: 'Tunis, Tunisia',
    profession: 'Gym Manager'
  },
  {
    email: 'manager@wildenergy.gym',
    password: 'password123',
    firstName: 'Manager',
    lastName: 'User',
    isAdmin: true,
    profileEmail: 'manager.contact@wildenergy.gym',
    status: 'active',
    phone: '+216 20 123 457',
    address: 'Sfax, Tunisia',
    profession: 'Operations Manager'
  },
  
  // Trainer users
  {
    email: 'sarah.trainer@wildenergy.gym',
    password: 'password123',
    firstName: 'Sarah',
    lastName: 'Johnson',
    profileEmail: 'sarah.contact@wildenergy.gym',
    status: 'active',
    phone: '+216 20 123 458',
    address: 'Tunis, Tunisia',
    profession: 'Fitness Trainer',
    specialization: 'Yoga & Pilates',
    experienceYears: 8,
    bio: 'Certified yoga instructor with 8 years of experience in Vinyasa and Hatha yoga. Specializes in beginner-friendly classes and therapeutic yoga.',
    certification: 'RYT-500, Pilates Certified',
    hourlyRate: 80.00
  },
  {
    email: 'mike.trainer@wildenergy.gym',
    password: 'password123',
    firstName: 'Mike',
    lastName: 'Chen',
    profileEmail: 'mike.contact@wildenergy.gym',
    status: 'active',
    phone: '+216 20 123 459',
    address: 'Sousse, Tunisia',
    profession: 'Yoga Instructor',
    specialization: 'Cardio & HIIT',
    experienceYears: 5,
    bio: 'High-energy fitness trainer specializing in cardio and HIIT workouts. Former competitive athlete with a passion for helping people reach their fitness goals.',
    certification: 'ACE Certified Personal Trainer',
    hourlyRate: 70.00
  },
  
  // Member users
  {
    email: 'john.member@wildenergy.gym',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    profileEmail: 'john.contact@wildenergy.gym',
    status: 'active',
    phone: '+216 20 123 460',
    address: 'Tunis, Tunisia',
    profession: 'Software Developer',
    memberNotes: 'Regular member, very active',
    subscriptionStatus: 'active',
    credit: 50.00
  },
  {
    email: 'maria.member@wildenergy.gym',
    password: 'password123',
    firstName: 'Maria',
    lastName: 'Garcia',
    profileEmail: 'maria.contact@wildenergy.gym',
    status: 'active',
    phone: '+216 20 123 461',
    address: 'Sfax, Tunisia',
    profession: 'Teacher',
    memberNotes: 'New member, needs guidance',
    subscriptionStatus: 'inactive',
    credit: 0.00
  },
  
  // Hybrid user (member + trainer)
  {
    email: 'alex.hybrid@wildenergy.gym',
    password: 'password123',
    firstName: 'Alex',
    lastName: 'Wilson',
    profileEmail: 'alex.contact@wildenergy.gym',
    status: 'active',
    phone: '+216 20 123 462',
    address: 'Tunis, Tunisia',
    profession: 'Personal Trainer',
    memberNotes: 'Member who also trains others',
    subscriptionStatus: 'active',
    credit: 100.00,
    specialization: 'Strength Training',
    experienceYears: 10,
    bio: 'Strength and conditioning specialist with 10 years of experience. Focuses on functional movement and progressive overload training.',
    certification: 'NSCA-CSCS, CrossFit Level 2',
    hourlyRate: 85.00
  },
  
  // Admin + Trainer user
  {
    email: 'sophie.admin@wildenergy.gym',
    password: 'password123',
    firstName: 'Sophie',
    lastName: 'Dubois',
    isAdmin: true,
    profileEmail: 'sophie.contact@wildenergy.gym',
    status: 'active',
    phone: '+216 20 123 463',
    address: 'Tunis, Tunisia',
    profession: 'Fitness Director',
    memberNotes: 'Admin who also trains',
    subscriptionStatus: 'active',
    credit: 0.00,
    specialization: 'Wellness & Meditation',
    experienceYears: 9,
    bio: 'Wellness coach and meditation instructor. Specializes in stress management, mindfulness, and holistic health approaches.',
    certification: 'Meditation Teacher Certified, Wellness Coach',
    hourlyRate: 75.00
  }
];

async function createWildEnergyTestUsers() {
  console.log('🚀 Creating WildEnergy test users in Supabase auth (New System)...\n');
  
  for (const user of wildEnergyTestUsers) {
    try {
      console.log(`📝 Creating user: ${user.email}`);
      
      // Step 1: Create auth user using Admin API
      const { data: authUser, error: authError } = await admin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          first_name: user.firstName,
          last_name: user.lastName
        }
      });
      
      if (authError) {
        console.error(`❌ Auth error: ${authError.message}`);
        continue;
      }
      
      if (!authUser || !authUser.user) {
        console.error(`❌ No user returned for ${user.email}`);
        continue;
      }
      
      console.log(`✅ Auth user created: ${user.email} (ID: ${authUser.user.id})`);
      
      // Step 2: Create account record
      const { data: accountRecord, error: accountError } = await supabase
        .from('accounts')
        .insert({
          auth_user_id: authUser.user.id,
          email: user.email,
          status: user.status,
          is_admin: user.isAdmin || false
        })
        .select()
        .single();
      
      if (accountError) {
        console.error(`❌ Account creation error: ${accountError.message}`);
        continue;
      }
      
      console.log(`✅ Account record created: ${accountRecord.id}`);
      
      // Step 3: Create profile record
      const { data: profileRecord, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: accountRecord.id, // Use account ID as profile ID
          first_name: user.firstName,
          last_name: user.lastName,
          phone: user.phone,
          profile_email: user.profileEmail,
          address: user.address,
          profession: user.profession
        })
        .select()
        .single();
      
      if (profileError) {
        console.error(`❌ Profile creation error: ${profileError.message}`);
        continue;
      }
      
      console.log(`✅ Profile record created: ${profileRecord.id}`);
      
      // Step 4: Admin status is now handled in the accounts table (is_admin column)
      
      // Step 5: If user has member data, create member record
      if (user.memberNotes || user.subscriptionStatus || user.credit !== undefined) {
        const { data: memberRecord, error: memberError } = await supabase
          .from('members')
          .insert({
            account_id: accountRecord.id,
            profile_id: accountRecord.id,
            member_notes: user.memberNotes || '',
            credit: user.credit || 0,
            status: user.status,
            // subscription_status removed - determined dynamically from subscriptions table
          })
          .select()
          .single();
        
        if (memberError) {
          console.error(`❌ Member record creation error: ${memberError.message}`);
        } else {
          console.log(`✅ Member record created: ${memberRecord.id}`);
        }
      }
      
      // Step 6: If user has trainer data, create trainer record
      if (user.specialization || user.experienceYears || user.bio || user.certification || user.hourlyRate) {
        const { data: trainerRecord, error: trainerError } = await supabase
          .from('trainers')
          .insert({
            account_id: accountRecord.id,
            profile_id: accountRecord.id,
            specialization: user.specialization || 'General Fitness',
            experience_years: user.experienceYears || 5,
            bio: user.bio || `Experienced ${user.specialization || 'fitness'} instructor`,
            certification: user.certification || 'Certified Personal Trainer',
            hourly_rate: user.hourlyRate || 50.00,
            status: user.status
          })
          .select()
          .single();
        
        if (trainerError) {
          console.error(`❌ Trainer record creation error: ${trainerError.message}`);
        } else {
          console.log(`✅ Trainer record created: ${trainerRecord.id}`);
        }
      }
      
      console.log(`✅ User ${user.email} completed successfully!\n`);
      
    } catch (error) {
      console.error(`❌ Error processing ${user.email}: ${error.message}`);
    }
  }
  
  console.log('\n🎉 All WildEnergy test users creation completed!');
  console.log('\n🔐 Login Credentials:');
  wildEnergyTestUsers.forEach(user => {
    console.log(`${user.email} / ${user.password}`);
  });
  
  console.log('\n💡 What was created:');
  console.log('1. Auth users in Supabase auth');
  console.log('2. Account records in accounts table (with is_admin flag)');
  console.log('3. Profile records in profiles table');
  console.log('4. Member records for member users');
  console.log('5. Trainer records for trainer users');
  console.log('\n👥 User Types (determined by data presence):');
  console.log('- Admin users: Have isAdmin field → accounts.is_admin = true');
  console.log('- Member users: Have memberNotes/credit/subscriptionStatus → members table');
  console.log('- Trainer users: Have specialization/experienceYears/bio → trainers table');
  console.log('- Hybrid users: Have both member and trainer data');
  console.log('- Admin + Trainer: Have isAdmin + trainer data');
  console.log('\n📊 User Statuses:');
  console.log('- active: Can use the system');
  console.log('- pending: Awaiting approval');
  console.log('- archived: Inactive users');
}

createWildEnergyTestUsers().catch(console.error);
