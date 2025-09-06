#!/usr/bin/env node

/**
 * Script to create users in WildEnergy Supabase
 * Creates auth users and user records for the gym management system
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

// WildEnergy users
const wildEnergyUsers = [
  // Admin users
  {
    email: 'admin@wildenergy.gym',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    isAdmin: true,
    isMember: false,
    isTrainer: false,
    status: 'active',
    subscriptionStatus: 'inactive',
    phone: '+216 20 123 456',
    memberNotes: 'System administrator'
  },
  {
    email: 'manager@wildenergy.gym',
    password: 'manager123',
    firstName: 'Manager',
    lastName: 'User',
    isAdmin: true,
    isMember: false,
    isTrainer: false,
    status: 'active',
    subscriptionStatus: 'inactive',
    phone: '+216 20 123 457',
    memberNotes: 'Gym manager'
  },
  // Trainer users
  {
    email: 'trainer1@wildenergy.gym',
    password: 'trainer123',
    firstName: 'Sarah',
    lastName: 'Johnson',
    isAdmin: false,
    isMember: true,
    isTrainer: true,
    status: 'active',
    subscriptionStatus: 'active',
    phone: '+216 20 123 458',
    memberNotes: 'Pole dance specialist'
  },
  {
    email: 'trainer2@wildenergy.gym',
    password: 'trainer123',
    firstName: 'Ahmed',
    lastName: 'Ben Ali',
    isAdmin: false,
    isMember: true,
    isTrainer: true,
    status: 'active',
    subscriptionStatus: 'active',
    phone: '+216 20 123 459',
    memberNotes: 'Yoga and stretching instructor'
  },
  {
    email: 'trainer3@wildenergy.gym',
    password: 'trainer123',
    firstName: 'Fatma',
    lastName: 'Trabelsi',
    isAdmin: false,
    isMember: true,
    isTrainer: true,
    status: 'active',
    subscriptionStatus: 'active',
    phone: '+216 20 123 460',
    memberNotes: 'Cardio and strength training'
  },
  // Member users
  {
    email: 'member@wildenergy.gym',
    password: 'member123',
    firstName: 'Amina',
    lastName: 'Karray',
    isAdmin: false,
    isMember: true,
    isTrainer: false,
    status: 'active',
    subscriptionStatus: 'active',
    phone: '+216 20 123 461',
    memberNotes: 'Regular member - pole dance enthusiast'
  },
  {
    email: 'member2@wildenergy.gym',
    password: 'member123',
    firstName: 'Mohamed',
    lastName: 'Mansouri',
    isAdmin: false,
    isMember: true,
    isTrainer: false,
    status: 'active',
    subscriptionStatus: 'active',
    phone: '+216 20 123 462',
    memberNotes: 'New member - interested in yoga'
  },
  {
    email: 'member3@wildenergy.gym',
    password: 'member123',
    firstName: 'Sara',
    lastName: 'Ben Salem',
    isAdmin: false,
    isMember: true,
    isTrainer: false,
    status: 'active',
    subscriptionStatus: 'active',
    phone: '+216 20 123 463',
    memberNotes: 'VIP member - unlimited classes'
  },
  {
    email: 'member4@wildenergy.gym',
    password: 'member123',
    firstName: 'Youssef',
    lastName: 'Haddad',
    isAdmin: false,
    isMember: true,
    isTrainer: false,
    status: 'pending',
    subscriptionStatus: 'inactive',
    phone: '+216 20 123 464',
    memberNotes: 'Pending approval'
  },
  {
    email: 'member5@wildenergy.gym',
    password: 'member123',
    firstName: 'Nour',
    lastName: 'Bouazizi',
    isAdmin: false,
    isMember: true,
    isTrainer: false,
    status: 'archived',
    subscriptionStatus: 'inactive',
    phone: '+216 20 123 465',
    memberNotes: 'Former member - archived'
  }
];

async function createWildEnergyUsers() {
  console.log('🚀 Creating WildEnergy users in Supabase auth...\n');
  
  for (const user of wildEnergyUsers) {
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
      
      // Step 2: Create user record in users table
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authUser.user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          phone: user.phone,
          is_admin: user.isAdmin,
          is_member: user.isMember,
          is_trainer: user.isTrainer,
          status: user.status,
          subscription_status: user.subscriptionStatus,
          member_notes: user.memberNotes
        })
        .select()
        .single();
      
      if (userError) {
        console.error(`❌ User record creation error: ${userError.message}`);
        continue;
      }
      
      console.log(`✅ User record created: ${userRecord.id}`);
      
      // Step 3: If user is a trainer, create trainer record
      if (user.isTrainer) {
        const specializations = {
          'trainer1@wildenergy.gym': 'Pole Dance',
          'trainer2@wildenergy.gym': 'Yoga & Stretching',
          'trainer3@wildenergy.gym': 'Cardio & Strength'
        };
        
        const { data: trainerRecord, error: trainerError } = await supabase
          .from('trainers')
          .insert({
            user_id: userRecord.id,
            specialization: specializations[user.email] || 'General Fitness',
            experience_years: Math.floor(Math.random() * 10) + 2, // 2-11 years
            bio: `Experienced ${specializations[user.email] || 'fitness'} instructor`,
            certification: 'Certified Personal Trainer'
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
  
  console.log('\n🎉 All WildEnergy users creation completed!');
  console.log('\n🔐 Login Credentials:');
  wildEnergyUsers.forEach(user => {
    console.log(`${user.email} / ${user.password}`);
  });
  
  console.log('\n💡 What was created:');
  console.log('1. Auth users in Supabase auth');
  console.log('2. User records in users table');
  console.log('3. Trainer records for trainer users');
  console.log('\n👥 User Types:');
  console.log('- Admin users: Full system access');
  console.log('- Manager users: Administrative access');
  console.log('- Trainer users: Can teach classes');
  console.log('- Member users: Can register for classes');
  console.log('\n📊 User Statuses:');
  console.log('- active: Can use the system');
  console.log('- pending: Awaiting approval');
  console.log('- archived: Inactive users');
}

createWildEnergyUsers().catch(console.error);
