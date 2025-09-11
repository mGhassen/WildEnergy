#!/usr/bin/env node

/**
 * Integrated script to reset Supabase database, create test users, and seed data
 * This script calls existing scripts in the correct order
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting WildEnergy database reset and seeding process...\n');

try {
  // Step 1: Reset Supabase database
  console.log('🔄 Step 1: Resetting Supabase database...');
  execSync('supabase db reset', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Database reset completed\n');

  // Step 2: Create test users
  console.log('👥 Step 2: Creating test users...');
  execSync('node scripts/create-test-users.js', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Test users created\n');

  // Step 3: Seed data
  console.log('🌱 Step 3: Seeding data...');
  execSync('node scripts/seed-data.js', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Data seeded\n');

  console.log('🎉 All steps completed successfully!');
  console.log('\n📋 Summary:');
  console.log('1. ✅ Database reset (migrations applied)');
  console.log('2. ✅ Test users created');
  console.log('3. ✅ Data seeded (groups, categories, trainers, classes, plans, schedules, courses)');
  
  console.log('\n🔐 Test User Credentials:');
  console.log('Admin: admin@wildenergy.gym / password123');
  console.log('Manager: manager@wildenergy.gym / password123');
  console.log('Trainer: sarah.trainer@wildenergy.gym / password123');
  console.log('Member: john.member@wildenergy.gym / password123');
  console.log('Hybrid: alex.hybrid@wildenergy.gym / password123');

} catch (error) {
  console.error('❌ Error during reset and seed process:', error.message);
  process.exit(1);
}
