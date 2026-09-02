#!/usr/bin/env node

/**
 * Seed data script for Wild Energy platform
 * This script properly seeds the database with all required data including
 * schedules with proper start_date and end_date values to satisfy constraints
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

// Calculate date ranges for schedules (next 3 months)
const today = new Date();
const startDate = new Date(today);
startDate.setDate(today.getDate() + 1); // Start from tomorrow

const endDate = new Date(today);
endDate.setMonth(today.getMonth() + 3); // 3 months from now

const formatDate = (date) => date.toISOString().split('T')[0];

async function seedData() {
  try {
    console.log('🌱 Starting data seeding...');

    // 1. Get or Create Groups
    console.log('📁 Getting groups...');
    let { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .order('id');

    if (groupsError) throw groupsError;
    
    if (!groups || groups.length === 0) {
      console.log('📁 Creating groups...');
      const { data: newGroups, error: newGroupsError } = await supabase
        .from('groups')
        .insert([
          { name: 'Fitness Basics', description: 'Core fitness categories for general health', color: '#4ECDC4', is_active: true },
          { name: 'Pole Dance Group', description: 'Pole dancing and flexibility training', color: '#FF1493', is_active: true },
          { name: 'Dance & Movement', description: 'Various dance styles and movement', color: '#FF69B4', is_active: true },
          { name: 'Combat Sports', description: 'Martial arts and self-defense', color: '#8B4513', is_active: true },
          { name: 'Wellness & Recovery', description: 'Relaxation and recovery focused activities', color: '#9B59B6', is_active: true }
        ])
        .select();
      
      if (newGroupsError) throw newGroupsError;
      groups = newGroups;
      console.log(`✅ Created ${groups.length} groups`);
    } else {
      console.log(`✅ Found ${groups.length} existing groups`);
    }

    // 2. Get or Create Categories
    console.log('📂 Getting categories...');
    let { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('id');

    if (categoriesError) throw categoriesError;
    
    if (!categories || categories.length === 0) {
      console.log('📂 Creating categories...');
      const { data: newCategories, error: newCategoriesError } = await supabase
        .from('categories')
        .insert([
          { name: 'Yoga', description: 'Yoga classes for all levels', color: '#FFD700', is_active: true },
          { name: 'Cardio', description: 'Cardio and HIIT classes', color: '#FF6347', is_active: true },
          { name: 'Strength', description: 'Strength and conditioning', color: '#4682B4', is_active: true },
          { name: 'Pilates', description: 'Pilates and flexibility', color: '#8A2BE2', is_active: true },
          { name: 'Pole Dance', description: 'Pole dancing and aerial fitness', color: '#FF1493', is_active: true },
          { name: 'Stretching', description: 'Flexibility and mobility', color: '#32CD32', is_active: true },
          { name: 'Dance', description: 'Various dance styles', color: '#FF69B4', is_active: true },
          { name: 'Martial Arts', description: 'Self-defense and martial arts', color: '#8B4513', is_active: true },
          { name: 'Meditation', description: 'Mindfulness and meditation', color: '#9B59B6', is_active: true },
          { name: 'Breathing', description: 'Breathing exercises and relaxation', color: '#E67E22', is_active: true }
        ])
        .select();
      
      if (newCategoriesError) throw newCategoriesError;
      categories = newCategories;
      console.log(`✅ Created ${categories.length} categories`);
      
      // Create category-group relationships (many-to-many)
      console.log('🔗 Creating category-group relationships...');
      const categoryGroupRelations = [
        // Fitness Basics group (groups[0])
        { category_id: categories[0].id, group_id: groups[0].id }, // Yoga
        { category_id: categories[1].id, group_id: groups[0].id }, // Cardio
        { category_id: categories[2].id, group_id: groups[0].id }, // Strength
        { category_id: categories[3].id, group_id: groups[0].id }, // Pilates
        
        // Pole Dance Group (groups[1])
        { category_id: categories[4].id, group_id: groups[1].id }, // Pole Dance
        { category_id: categories[5].id, group_id: groups[1].id }, // Stretching
        
        // Dance & Movement (groups[2])
        { category_id: categories[6].id, group_id: groups[2].id }, // Dance
        
        // Combat Sports (groups[3])
        { category_id: categories[7].id, group_id: groups[3].id }, // Martial Arts
        
        // Wellness & Recovery (groups[4])
        { category_id: categories[8].id, group_id: groups[4].id }, // Meditation
        { category_id: categories[9].id, group_id: groups[4].id }, // Breathing
        
        // Some categories can belong to multiple groups
        { category_id: categories[5].id, group_id: groups[0].id }, // Stretching also in Fitness Basics
        { category_id: categories[3].id, group_id: groups[4].id }, // Pilates also in Wellness
      ];
      
      const { error: relationsError } = await supabase
        .from('category_groups')
        .insert(categoryGroupRelations);
      
      if (relationsError) throw relationsError;
      console.log(`✅ Created ${categoryGroupRelations.length} category-group relationships`);
    } else {
      console.log(`✅ Found ${categories.length} existing categories`);
    }

    // 3. Get or Create Trainer Accounts and Profiles
    console.log('👨‍🏫 Getting trainers...');
    let { data: existingTrainers, error: trainersQueryError } = await supabase
      .from('trainers')
      .select(`
        *,
        accounts!inner(email),
        profiles!inner(first_name, last_name)
      `)
      .order('id');

    if (trainersQueryError) throw trainersQueryError;
    
    let trainers = [];
    
    if (!existingTrainers || existingTrainers.length === 0) {
      console.log('👨‍🏫 Creating trainer accounts and profiles...');
      
      const trainerData = [
      { 
        email: 'sarah.trainer@wildenergy.tn', 
        firstName: 'Sarah', 
        lastName: 'Johnson',
        phone: '+216 20 123 458',
        address: 'Tunis, Tunisia',
        profession: 'Fitness Trainer',
        specialization: 'Yoga & Pilates', 
        experience_years: 8, 
        bio: 'Certified yoga instructor with 8 years of experience in Vinyasa and Hatha yoga. Specializes in beginner-friendly classes and therapeutic yoga.', 
        certification: 'RYT-500, Pilates Certified',
        hourly_rate: 80.00
      },
      { 
        email: 'mike.trainer@wildenergy.tn', 
        firstName: 'Mike', 
        lastName: 'Chen',
        phone: '+216 20 123 459',
        address: 'Sousse, Tunisia',
        profession: 'Fitness Trainer',
        specialization: 'Cardio & HIIT', 
        experience_years: 5, 
        bio: 'High-energy fitness trainer specializing in cardio and HIIT workouts. Former competitive athlete with a passion for helping people reach their fitness goals.', 
        certification: 'ACE Certified Personal Trainer',
        hourly_rate: 70.00
      },
      { 
        email: 'alex.trainer@wildenergy.tn', 
        firstName: 'Alex', 
        lastName: 'Wilson',
        phone: '+216 20 123 460',
        address: 'Tunis, Tunisia',
        profession: 'Personal Trainer',
        specialization: 'Strength Training', 
        experience_years: 10, 
        bio: 'Strength and conditioning specialist with 10 years of experience. Focuses on functional movement and progressive overload training.', 
        certification: 'NSCA-CSCS, CrossFit Level 2',
        hourly_rate: 85.00
      },
      { 
        email: 'luna.trainer@wildenergy.tn', 
        firstName: 'Luna', 
        lastName: 'Martinez',
        phone: '+216 20 123 461',
        address: 'Sfax, Tunisia',
        profession: 'Pole Dance Instructor',
        specialization: 'Pole Dance', 
        experience_years: 6, 
        bio: 'Professional pole dance instructor and performer. Specializes in beginner to advanced pole techniques, flexibility, and strength training.', 
        certification: 'Pole Fitness Alliance Certified',
        hourly_rate: 75.00
      },
      { 
        email: 'carlos.trainer@wildenergy.tn', 
        firstName: 'Carlos', 
        lastName: 'Rodriguez',
        phone: '+216 20 123 462',
        address: 'Tunis, Tunisia',
        profession: 'Dance Instructor',
        specialization: 'Dance & Movement', 
        experience_years: 12, 
        bio: 'Professional dancer and choreographer with 12 years of experience. Teaches various dance styles including salsa, bachata, and contemporary.', 
        certification: 'Dance Teacher Certified',
        hourly_rate: 65.00
      },
      { 
        email: 'kenji.trainer@wildenergy.tn', 
        firstName: 'Kenji', 
        lastName: 'Tanaka',
        phone: '+216 20 123 463',
        address: 'Tunis, Tunisia',
        profession: 'Martial Arts Instructor',
        specialization: 'Martial Arts', 
        experience_years: 15, 
        bio: 'Black belt in multiple martial arts disciplines. Specializes in self-defense, kickboxing, and traditional martial arts forms.', 
        certification: 'Black Belt 3rd Dan, Krav Maga Instructor',
        hourly_rate: 90.00
      },
      { 
        email: 'yoga.trainer@wildenergy.tn', 
        firstName: 'Emma', 
        lastName: 'Thompson',
        phone: '+216 20 123 464',
        address: 'Sousse, Tunisia',
        profession: 'Flexibility Specialist',
        specialization: 'Flexibility & Recovery', 
        experience_years: 7, 
        bio: 'Flexibility and mobility specialist. Focuses on injury prevention, recovery techniques, and improving range of motion.', 
        certification: 'Stretch Therapy Certified',
        hourly_rate: 60.00
      },
      { 
        email: 'zen.trainer@wildenergy.tn', 
        firstName: 'Sophie', 
        lastName: 'Dubois',
        phone: '+216 20 123 465',
        address: 'Tunis, Tunisia',
        profession: 'Wellness Coach',
        specialization: 'Wellness & Meditation', 
        experience_years: 9, 
        bio: 'Wellness coach and meditation instructor. Specializes in stress management, mindfulness, and holistic health approaches.', 
        certification: 'Meditation Teacher Certified, Wellness Coach',
        hourly_rate: 75.00
      }
    ];

      for (const trainer of trainerData) {
        // Create profile first
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            first_name: trainer.firstName,
            last_name: trainer.lastName,
            phone: trainer.phone,
            address: trainer.address,
            profession: trainer.profession
          })
          .select()
          .single();
        
        if (profileError) throw profileError;
        
        // Create account with foreign key to profile
        const { data: account, error: accountError } = await supabase
          .from('accounts')
          .insert({
            email: trainer.email,
            status: 'active',
            profile_id: profile.id
          })
          .select()
          .single();
        
        if (accountError) throw accountError;
        
        // Create trainer record
        const { data: trainerRecord, error: trainerError } = await supabase
          .from('trainers')
          .insert({
            account_id: account.id,
            profile_id: profile.id, // Use profile.id instead of account.id
            specialization: trainer.specialization,
            experience_years: trainer.experience_years,
            bio: trainer.bio,
            certification: trainer.certification,
            hourly_rate: trainer.hourly_rate,
            status: 'active'
          })
          .select()
          .single();
        
        if (trainerError) throw trainerError;
        
        trainers.push(trainerRecord);
      }

      console.log(`✅ Created ${trainers.length} trainers with accounts and profiles`);
    } else {
      trainers = existingTrainers;
      console.log(`✅ Found ${trainers.length} existing trainers`);
    }

    // 4. Create Classes
    console.log('🏃‍♀️ Creating classes...');
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .insert([
        { name: 'Yoga Flow', description: 'Vinyasa yoga for all levels', category_id: categories[0].id, duration: 60, max_capacity: 18, equipment: 'Yoga mat', difficulty: ['beginner'], is_active: true },
        { name: 'Yoga Advanced', description: 'Advanced yoga poses and sequences', category_id: categories[0].id, duration: 75, max_capacity: 12, equipment: 'Yoga mat, blocks', difficulty: ['advanced'], is_active: true },
        { name: 'Cardio Blast', description: 'High-intensity interval training', category_id: categories[1].id, duration: 45, max_capacity: 25, equipment: 'None', difficulty: ['intermediate'], is_active: true },
        { name: 'HIIT Challenge', description: 'Extreme high-intensity workout', category_id: categories[1].id, duration: 30, max_capacity: 20, equipment: 'Kettlebells', difficulty: ['advanced'], is_active: true },
        { name: 'Strength Circuit', description: 'Strength and conditioning circuit', category_id: categories[2].id, duration: 60, max_capacity: 16, equipment: 'Dumbbells, resistance bands', difficulty: ['intermediate'], is_active: true },
        { name: 'Powerlifting Basics', description: 'Introduction to powerlifting techniques', category_id: categories[2].id, duration: 90, max_capacity: 8, equipment: 'Barbells, plates', difficulty: ['beginner'], is_active: true },
        { name: 'Pilates Core', description: 'Pilates class focused on core strength', category_id: categories[3].id, duration: 50, max_capacity: 14, equipment: 'Mat, ring', difficulty: ['beginner'], is_active: true },
        { name: 'Pilates Advanced', description: 'Advanced Pilates with equipment', category_id: categories[3].id, duration: 60, max_capacity: 10, equipment: 'Reformer, chair', difficulty: ['advanced'], is_active: true },
        { name: 'Pole Dance Beginner', description: 'Introduction to pole dancing', category_id: categories[4].id, duration: 60, max_capacity: 12, equipment: 'Pole', difficulty: ['beginner'], is_active: true },
        { name: 'Pole Dance Intermediate', description: 'Intermediate pole techniques', category_id: categories[4].id, duration: 75, max_capacity: 10, equipment: 'Pole', difficulty: ['intermediate'], is_active: true },
        { name: 'Flexibility Flow', description: 'Deep stretching and mobility', category_id: categories[5].id, duration: 45, max_capacity: 20, equipment: 'Mat, straps', difficulty: ['beginner'], is_active: true },
        { name: 'Salsa Basics', description: 'Learn basic salsa steps', category_id: categories[6].id, duration: 60, max_capacity: 15, equipment: 'None', difficulty: ['beginner'], is_active: true },
        { name: 'Bachata Sensual', description: 'Sensual bachata dancing', category_id: categories[6].id, duration: 60, max_capacity: 12, equipment: 'None', difficulty: ['intermediate'], is_active: true },
        { name: 'Kickboxing', description: 'High-energy martial arts workout', category_id: categories[7].id, duration: 50, max_capacity: 18, equipment: 'Gloves, pads', difficulty: ['intermediate'], is_active: true },
        { name: 'Self-Defense', description: 'Practical self-defense techniques', category_id: categories[7].id, duration: 60, max_capacity: 15, equipment: 'Pads, dummy', difficulty: ['beginner'], is_active: true },
        { name: 'Meditation Circle', description: 'Guided meditation and mindfulness', category_id: categories[8].id, duration: 30, max_capacity: 25, equipment: 'Cushions', difficulty: ['beginner'], is_active: true },
        { name: 'Breathing Workshop', description: 'Breathing exercises and relaxation', category_id: categories[9].id, duration: 45, max_capacity: 20, equipment: 'Mats, blankets', difficulty: ['beginner'], is_active: true }
      ])
      .select();

    if (classesError) throw classesError;
    console.log(`✅ Created ${classes.length} classes`);

    // 5. Get or Create Plans
    console.log('💳 Getting plans...');
    let { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .order('id');

    if (plansError) throw plansError;
    
    if (!plans || plans.length === 0) {
      console.log('💳 Creating plans...');
      const { data: newPlans, error: newPlansError } = await supabase
        .from('plans')
        .insert([
          { name: 'Basic Monthly', description: 'Basic monthly plan with limited sessions', price: 150.00, duration_days: 30, is_active: true },
          { name: 'Premium Monthly', description: 'Premium monthly plan with more variety', price: 250.00, duration_days: 30, is_active: true },
          { name: 'Pole Dance Special', description: 'Specialized pole dance plan', price: 280.00, duration_days: 30, is_active: true },
          { name: 'Flexibility Focus', description: 'Plan focused on stretching and mobility', price: 180.00, duration_days: 30, is_active: true },
          { name: 'Mixed Fitness', description: 'Balanced fitness plan', price: 320.00, duration_days: 30, is_active: true },
          { name: 'Wellness Package', description: 'Complete wellness and recovery plan', price: 200.00, duration_days: 30, is_active: true },
          { name: 'Drop-in Class', description: 'Single class access', price: 25.00, duration_days: 1, is_active: true },
          { name: 'Weekly Pass', description: 'One week unlimited access', price: 80.00, duration_days: 7, is_active: true }
        ])
        .select();
      
      if (newPlansError) throw newPlansError;
      plans = newPlans;
      console.log(`✅ Created ${plans.length} plans`);
    } else {
      console.log(`✅ Found ${plans.length} existing plans`);
    }

    // 6. Get or Create Plan Groups
    console.log('📋 Getting plan groups...');
    let { data: planGroups, error: planGroupsError } = await supabase
      .from('plan_groups')
      .select('*')
      .order('id');

    if (planGroupsError) throw planGroupsError;
    
    if (!planGroups || planGroups.length === 0) {
      console.log('📋 Creating plan groups...');
      const { data: newPlanGroups, error: newPlanGroupsError } = await supabase
        .from('plan_groups')
        .insert([
        // Basic Monthly: 8 sessions of Fitness Basics
        { plan_id: plans[0].id, group_id: groups[0].id, session_count: 8, is_free: false },
        
        // Premium Monthly: 12 sessions of Fitness Basics + 3 sessions of Dance & Movement
        { plan_id: plans[1].id, group_id: groups[0].id, session_count: 12, is_free: false },
        { plan_id: plans[1].id, group_id: groups[2].id, session_count: 3, is_free: false },
        
        // Pole Dance Special: 10 sessions of Pole Dance Group + 2 sessions of Wellness
        { plan_id: plans[2].id, group_id: groups[1].id, session_count: 10, is_free: false },
        { plan_id: plans[2].id, group_id: groups[4].id, session_count: 2, is_free: false },
        
        // Flexibility Focus: 6 sessions of Pole Dance Group + 4 sessions of Wellness
        { plan_id: plans[3].id, group_id: groups[1].id, session_count: 6, is_free: false },
        { plan_id: plans[3].id, group_id: groups[4].id, session_count: 4, is_free: false },
        
        // Mixed Fitness: 15 sessions total
        { plan_id: plans[4].id, group_id: groups[0].id, session_count: 12, is_free: false },
        { plan_id: plans[4].id, group_id: groups[2].id, session_count: 4, is_free: false },
        { plan_id: plans[4].id, group_id: groups[3].id, session_count: 2, is_free: false },
        { plan_id: plans[4].id, group_id: groups[4].id, session_count: 2, is_free: false },
        
        // Wellness Package: 8 sessions of Wellness + 4 sessions of Pole Dance Group
        { plan_id: plans[5].id, group_id: groups[4].id, session_count: 8, is_free: false },
        { plan_id: plans[5].id, group_id: groups[1].id, session_count: 4, is_free: false },
        
        // Drop-in Class: 1 session of any group
        { plan_id: plans[6].id, group_id: groups[0].id, session_count: 1, is_free: false },
        
        // Weekly Pass: 6 sessions of Fitness Basics + 4 sessions of any other group
        { plan_id: plans[7].id, group_id: groups[0].id, session_count: 6, is_free: false },
        { plan_id: plans[7].id, group_id: groups[1].id, session_count: 2, is_free: false },
        { plan_id: plans[7].id, group_id: groups[2].id, session_count: 2, is_free: false }
        ])
        .select();
      
      if (newPlanGroupsError) throw newPlanGroupsError;
      planGroups = newPlanGroups;
      console.log(`✅ Created ${planGroups.length} plan groups`);
    } else {
      console.log(`✅ Found ${planGroups.length} existing plan groups`);
    }

    // 7. Get or Create Schedules with proper start_date and end_date
    console.log('📅 Getting schedules...');
    let { data: existingSchedules, error: schedulesQueryError } = await supabase
      .from('schedules')
      .select('*')
      .order('id');

    if (schedulesQueryError) throw schedulesQueryError;
    
    let createdSchedules = [];
    
    if (!existingSchedules || existingSchedules.length === 0) {
      console.log('📅 Creating schedules...');
      
      // Use only available trainers (cycle through them if we have fewer than 8)
      const getTrainerId = (index) => trainers[index % trainers.length].id;
      
      const schedules = [
      // Monday schedules
      { class_id: classes[0].id, trainer_id: getTrainerId(0), start_time: '08:00', end_time: '09:00', day_of_week: 1, repetition_type: 'weekly', max_participants: 18, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[2].id, trainer_id: getTrainerId(1), start_time: '09:30', end_time: '10:15', day_of_week: 1, repetition_type: 'weekly', max_participants: 25, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[4].id, trainer_id: getTrainerId(2), start_time: '18:00', end_time: '19:00', day_of_week: 1, repetition_type: 'weekly', max_participants: 16, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[8].id, trainer_id: getTrainerId(3), start_time: '19:30', end_time: '20:30', day_of_week: 1, repetition_type: 'weekly', max_participants: 12, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      
      // Tuesday schedules
      { class_id: classes[1].id, trainer_id: getTrainerId(0), start_time: '07:00', end_time: '08:15', day_of_week: 2, repetition_type: 'weekly', max_participants: 12, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[3].id, trainer_id: getTrainerId(1), start_time: '09:00', end_time: '09:30', day_of_week: 2, repetition_type: 'weekly', max_participants: 20, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[6].id, trainer_id: getTrainerId(0), start_time: '17:00', end_time: '17:50', day_of_week: 2, repetition_type: 'weekly', max_participants: 14, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[10].id, trainer_id: getTrainerId(2), start_time: '18:30', end_time: '19:15', day_of_week: 2, repetition_type: 'weekly', max_participants: 20, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      
      // Wednesday schedules
      { class_id: classes[5].id, trainer_id: getTrainerId(2), start_time: '08:00', end_time: '09:30', day_of_week: 3, repetition_type: 'weekly', max_participants: 8, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[11].id, trainer_id: getTrainerId(0), start_time: '10:00', end_time: '11:00', day_of_week: 3, repetition_type: 'weekly', max_participants: 15, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[13].id, trainer_id: getTrainerId(1), start_time: '18:00', end_time: '18:50', day_of_week: 3, repetition_type: 'weekly', max_participants: 18, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[15].id, trainer_id: getTrainerId(3), start_time: '19:30', end_time: '20:00', day_of_week: 3, repetition_type: 'weekly', max_participants: 25, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      
      // Thursday schedules
      { class_id: classes[0].id, trainer_id: getTrainerId(0), start_time: '08:00', end_time: '09:00', day_of_week: 4, repetition_type: 'weekly', max_participants: 18, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[7].id, trainer_id: getTrainerId(0), start_time: '10:00', end_time: '11:00', day_of_week: 4, repetition_type: 'weekly', max_participants: 10, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[9].id, trainer_id: getTrainerId(3), start_time: '17:00', end_time: '18:15', day_of_week: 4, repetition_type: 'weekly', max_participants: 10, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[12].id, trainer_id: getTrainerId(0), start_time: '18:30', end_time: '19:30', day_of_week: 4, repetition_type: 'weekly', max_participants: 12, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      
      // Friday schedules
      { class_id: classes[2].id, trainer_id: getTrainerId(1), start_time: '08:30', end_time: '09:15', day_of_week: 5, repetition_type: 'weekly', max_participants: 25, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[4].id, trainer_id: getTrainerId(2), start_time: '10:00', end_time: '11:00', day_of_week: 5, repetition_type: 'weekly', max_participants: 16, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[14].id, trainer_id: getTrainerId(1), start_time: '17:00', end_time: '18:00', day_of_week: 5, repetition_type: 'weekly', max_participants: 15, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[16].id, trainer_id: getTrainerId(3), start_time: '18:30', end_time: '19:15', day_of_week: 5, repetition_type: 'weekly', max_participants: 20, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      
      // Saturday schedules
      { class_id: classes[0].id, trainer_id: getTrainerId(0), start_time: '09:00', end_time: '10:00', day_of_week: 6, repetition_type: 'weekly', max_participants: 18, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[8].id, trainer_id: getTrainerId(3), start_time: '10:30', end_time: '11:30', day_of_week: 6, repetition_type: 'weekly', max_participants: 12, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[11].id, trainer_id: getTrainerId(0), start_time: '12:00', end_time: '13:00', day_of_week: 6, repetition_type: 'weekly', max_participants: 15, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[10].id, trainer_id: getTrainerId(2), start_time: '14:00', end_time: '14:45', day_of_week: 6, repetition_type: 'weekly', max_participants: 20, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      
      // Sunday schedules
      { class_id: classes[1].id, trainer_id: getTrainerId(0), start_time: '09:00', end_time: '10:15', day_of_week: 0, repetition_type: 'weekly', max_participants: 12, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[6].id, trainer_id: getTrainerId(0), start_time: '10:30', end_time: '11:20', day_of_week: 0, repetition_type: 'weekly', max_participants: 14, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[15].id, trainer_id: getTrainerId(3), start_time: '11:30', end_time: '12:00', day_of_week: 0, repetition_type: 'weekly', max_participants: 25, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[13].id, trainer_id: getTrainerId(1), start_time: '16:00', end_time: '16:50', day_of_week: 0, repetition_type: 'weekly', max_participants: 18, is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) }
    ];

      const { data: newSchedules, error: schedulesError } = await supabase
        .from('schedules')
        .insert(schedules)
        .select();

      if (schedulesError) throw schedulesError;
      createdSchedules = newSchedules;
      console.log(`✅ Created ${createdSchedules.length} schedules`);
    } else {
      createdSchedules = existingSchedules;
      console.log(`✅ Found ${createdSchedules.length} existing schedules`);
    }

    // 8. Get or Create sample courses for the next 4 weeks
    console.log('📚 Getting courses...');
    let { data: existingCourses, error: coursesQueryError } = await supabase
      .from('courses')
      .select('*')
      .order('id');

    if (coursesQueryError) throw coursesQueryError;
    
    let createdCourses = [];
    
    if (!existingCourses || existingCourses.length === 0) {
      console.log('📚 Creating sample courses...');
      const courses = [];
      const courseStartDate = new Date(startDate);
      
      for (let week = 0; week < 4; week++) {
        const weekDate = new Date(courseStartDate);
        weekDate.setDate(courseStartDate.getDate() + (week * 7));
        
        // Add courses for first 4 schedules (Monday classes)
        for (let i = 0; i < 4; i++) {
          const schedule = createdSchedules[i];
          const courseDate = new Date(weekDate);
          courseDate.setDate(weekDate.getDate() + (i === 0 ? 0 : i === 1 ? 1 : i === 2 ? 2 : i === 3 ? 3 : 0));
          
          courses.push({
            schedule_id: schedule.id,
            class_id: schedule.class_id,
            trainer_id: schedule.trainer_id,
            course_date: formatDate(courseDate),
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            max_participants: schedule.max_participants,
            current_participants: 0,
            status: 'scheduled',
            is_active: true
          });
        }
      }

      const { data: newCourses, error: coursesError } = await supabase
        .from('courses')
        .insert(courses)
        .select();

      if (coursesError) throw coursesError;
      createdCourses = newCourses;
      console.log(`✅ Created ${createdCourses.length} sample courses`);
    } else {
      createdCourses = existingCourses;
      console.log(`✅ Found ${createdCourses.length} existing courses`);
    }

    // 9. Get or Create Terms and Conditions
    console.log('📋 Getting terms and conditions...');
    let { data: existingTerms, error: termsQueryError } = await supabase
      .from('terms_and_conditions')
      .select('*')
      .order('created_at', { ascending: false });

    if (termsQueryError) throw termsQueryError;
    
    let termsCreated = 0;
    
    // Check if we have the required terms
    const hasTerms = existingTerms?.some(term => term.term_type === 'terms');
    const hasInteriorRegulation = existingTerms?.some(term => term.term_type === 'interior_regulation');
    
    if (!hasTerms || !hasInteriorRegulation) {
      console.log('📋 Creating terms and conditions...');
      
      // Create terms and conditions (CGU) if missing
      if (!hasTerms) {
        // First, deactivate any existing terms of the same type (if any exist)
        const { error: deactivateError } = await supabase
          .from('terms_and_conditions')
          .update({ is_active: false })
          .eq('term_type', 'terms');
        
        if (deactivateError) {
          console.log('No existing terms to deactivate, continuing...');
        }
        
        // Create first terms and conditions (CGU) - version 1.0
        const { data: newTerms1, error: terms1Error } = await supabase
          .from('terms_and_conditions')
          .insert({
            version: '1.0',
            title: 'Conditions Générales d\'Utilisation (CGU)',
            content: `# Conditions Générales d'Utilisation (CGU)  
**Wild Energy – Studio de Pole Dance**

---

## Article 1 – Objet  
Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de définir les modalités et conditions dans lesquelles **Wild Energy** (ci-après « le Studio ») propose ses cours, activités et évènements de pole dance, ainsi que l'utilisation de ses services en ligne (site internet, réseaux sociaux, réservations).  

Toute inscription ou participation aux activités implique l'acceptation pleine et entière des présentes CGU.  

---

## Article 2 – Accès aux services  
Les cours et évènements proposés par **Wild Energy** sont accessibles sur inscription et sous réserve de disponibilité.  

Les frais liés à l'inscription, au transport et à l'équipement personnel (tenue, chaussures, etc.) sont à la charge de l'élève.  

Le Studio se réserve le droit de refuser l'accès à une personne ne respectant pas le règlement intérieur ou les présentes CGU.  

---

## Article 3 – Inscription et paiement  
- L'inscription aux cours se fait en ligne ou directement auprès du Studio.  
- Les paiements doivent être effectués avant le début du cours ou selon les modalités prévues par l'abonnement.  
- Toute réservation est personnelle et non cessible.  

---

## Article 4 – Conditions de participation  
Les élèves s'engagent à :  
1. Respecter les règles de sécurité et les consignes données par les professeurs.  
2. Informer le Studio de toute contre-indication médicale avant la participation.  
3. Avoir une attitude respectueuse envers les autres élèves et le personnel.  

Le Studio ne peut être tenu responsable en cas de blessure résultant du non-respect des consignes.  

---

## Article 5 – Droit à l'image  
Dans le cadre des cours, évènements, spectacles et activités organisés par **Wild Energy**, des photos et vidéos peuvent être réalisées.  

- En s'inscrivant, l'élève autorise le Studio à capter et utiliser son image et/ou sa voix à des fins de communication, promotion et diffusion (site internet, réseaux sociaux, supports publicitaires).  
- Cette autorisation est consentie à titre gratuit, valable pour le monde entier et pour une durée de 10 ans, renouvelable tacitement.  
- L'élève peut retirer son consentement à tout moment en adressant une demande écrite au Studio.  

---

## Article 6 – Propriété intellectuelle  
Les contenus proposés par **Wild Energy** (cours, chorégraphies, supports pédagogiques, photos, vidéos, logos) sont protégés par le droit d'auteur et le droit de la propriété intellectuelle.  

Toute reproduction, diffusion ou exploitation sans autorisation est strictement interdite.  

---

## Article 7 – Responsabilité  
- Chaque élève est responsable de sa propre sécurité et de son état de santé lors des cours.  
- Le Studio décline toute responsabilité en cas d'accident lié au non-respect des consignes ou à une condition médicale non signalée.  
- Les objets personnels laissés dans les vestiaires ou dans le Studio relèvent de la responsabilité exclusive de l'élève.  

---

## Article 8 – Données personnelles  
Les informations collectées lors de l'inscription (nom, prénom, coordonnées) sont utilisées uniquement pour la gestion des cours et abonnements.  

Conformément à la réglementation en vigueur, chaque élève dispose d'un droit d'accès, de rectification et de suppression de ses données, sur simple demande adressée au Studio.  

---

## Article 9 – Annulation et remboursement  
- Toute annulation de cours doit être signalée dans un délai de [XX heures] avant le début du cours.  
- Les cours non annulés dans les délais sont considérés comme dus.  
- Aucun remboursement ne sera effectué, sauf cas de force majeure ou décision exceptionnelle du Studio.  

---

## Article 10 – Modification des CGU  
**Wild Energy** se réserve le droit de modifier les présentes CGU à tout moment.  

Les nouvelles dispositions seront applicables dès leur mise en ligne ou leur communication aux élèves.  

---

## Article 11 – Loi applicable et juridiction compétente  
Les présentes CGU sont régies par le droit [français/tunisien, à adapter].  
Tout litige relatif à leur interprétation ou exécution relève des tribunaux compétents du ressort du siège du Studio, sauf disposition légale contraire.  

---`,
            term_type: 'terms',
            is_active: true,
            effective_date: new Date().toISOString()
          })
          .select();

        if (terms1Error) throw terms1Error;
        termsCreated++;
        console.log(`✅ Created first terms and conditions (CGU) v1.0`);

        // Create second terms and conditions (CGU) - version 2.0
        const { data: newTerms2, error: terms2Error } = await supabase
          .from('terms_and_conditions')
          .insert({
            version: '2.0',
            title: 'Conditions Générales d\'Utilisation (CGU) - Mise à jour',
            content: `# Conditions Générales d'Utilisation (CGU) - Version 2.0
**Wild Energy – Studio de Pole Dance**

---

## Article 1 – Objet  
Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de définir les modalités et conditions dans lesquelles **Wild Energy** (ci-après « le Studio ») propose ses cours, activités et évènements de pole dance, ainsi que l'utilisation de ses services en ligne (site internet, réseaux sociaux, réservations).  

Toute inscription ou participation aux activités implique l'acceptation pleine et entière des présentes CGU.  

---

## Article 2 – Accès aux services  
Les cours et évènements proposés par **Wild Energy** sont accessibles sur inscription et sous réserve de disponibilité.  

Les frais liés à l'inscription, au transport et à l'équipement personnel (tenue, chaussures, etc.) sont à la charge de l'élève.  

Le Studio se réserve le droit de refuser l'accès à une personne ne respectant pas le règlement intérieur ou les présentes CGU.  

---

## Article 3 – Inscription et paiement  
- L'inscription aux cours se fait en ligne ou directement auprès du Studio.  
- Les paiements doivent être effectués avant le début du cours ou selon les modalités prévues par l'abonnement.  
- Toute réservation est personnelle et non cessible.  
- Les abonnements sont valables pour une durée déterminée et ne sont pas remboursables.  

---

## Article 4 – Conditions de participation  
Les élèves s'engagent à :  
1. Respecter les règles de sécurité et les consignes données par les professeurs.  
2. Informer le Studio de toute contre-indication médicale avant la participation.  
3. Avoir une attitude respectueuse envers les autres élèves et le personnel.  
4. Signer une décharge de responsabilité avant la première participation.  

Le Studio ne peut être tenu responsable en cas de blessure résultant du non-respect des consignes.  

---

## Article 5 – Droit à l'image  
Dans le cadre des cours, évènements, spectacles et activités organisés par **Wild Energy**, des photos et vidéos peuvent être réalisées.  

- En s'inscrivant, l'élève autorise le Studio à capter et utiliser son image et/ou sa voix à des fins de communication, promotion et diffusion (site internet, réseaux sociaux, supports publicitaires).  
- Cette autorisation est consentie à titre gratuit, valable pour le monde entier et pour une durée de 10 ans, renouvelable tacitement.  
- L'élève peut retirer son consentement à tout moment en adressant une demande écrite au Studio.  

---

## Article 6 – Propriété intellectuelle  
Les contenus proposés par **Wild Energy** (cours, chorégraphies, supports pédagogiques, photos, vidéos, logos) sont protégés par le droit d'auteur et le droit de la propriété intellectuelle.  

Toute reproduction, diffusion ou exploitation sans autorisation est strictement interdite.  

---

## Article 7 – Responsabilité  
- Chaque élève est responsable de sa propre sécurité et de son état de santé lors des cours.  
- Le Studio décline toute responsabilité en cas d'accident lié au non-respect des consignes ou à une condition médicale non signalée.  
- Les objets personnels laissés dans les vestiaires ou dans le Studio relèvent de la responsabilité exclusive de l'élève.  
- Une assurance responsabilité civile est recommandée pour tous les participants.  

---

## Article 8 – Données personnelles  
Les informations collectées lors de l'inscription (nom, prénom, coordonnées) sont utilisées uniquement pour la gestion des cours et abonnements.  

Conformément à la réglementation en vigueur, chaque élève dispose d'un droit d'accès, de rectification et de suppression de ses données, sur simple demande adressée au Studio.  

---

## Article 9 – Annulation et remboursement  
- Toute annulation de cours doit être signalée dans un délai de 24 heures avant le début du cours.  
- Les cours non annulés dans les délais sont considérés comme dus.  
- Aucun remboursement ne sera effectué, sauf cas de force majeure ou décision exceptionnelle du Studio.  
- Les abonnements suspendus pour cause médicale peuvent être reportés sur présentation d'un certificat médical.  

---

## Article 10 – Modification des CGU  
**Wild Energy** se réserve le droit de modifier les présentes CGU à tout moment.  

Les nouvelles dispositions seront applicables dès leur mise en ligne ou leur communication aux élèves.  

---

## Article 11 – Loi applicable et juridiction compétente  
Les présentes CGU sont régies par le droit tunisien.  
Tout litige relatif à leur interprétation ou exécution relève des tribunaux compétents du ressort du siège du Studio, sauf disposition légale contraire.  

---`,
            term_type: 'terms',
            is_active: false,
            effective_date: new Date().toISOString()
          })
          .select();

        if (terms2Error) throw terms2Error;
        termsCreated++;
        console.log(`✅ Created second terms and conditions (CGU) v2.0`);

        // Try to create a third terms record to test the constraint
        const { data: newTerms3, error: terms3Error } = await supabase
          .from('terms_and_conditions')
          .insert({
            version: '3.0',
            title: 'Conditions Générales d\'Utilisation (CGU) - Test Constraint',
            content: `# Test Terms - Version 3.0
This is a test to see if we can create multiple active terms records.`,
            term_type: 'terms',
            is_active: true, // This should fail due to unique constraint
            effective_date: new Date().toISOString()
          })
          .select();

        if (terms3Error) {
          console.log(`❌ Expected error creating third terms (constraint working): ${terms3Error.message}`);
        } else {
          console.log(`⚠️  Unexpected success creating third terms - constraint might not be working!`);
          termsCreated++;
        }
      }
      
      // Create interior regulation if missing
      if (!hasInteriorRegulation) {
        // Deactivate any existing interior regulations (if any exist)
        const { error: deactivateInteriorError } = await supabase
          .from('terms_and_conditions')
          .update({ is_active: false })
          .eq('term_type', 'interior_regulation');
        
        if (deactivateInteriorError) {
          console.log('No existing interior regulations to deactivate, continuing...');
        }
        
        // Create interior regulation
        const { data: newInteriorRegulation, error: interiorRegulationError } = await supabase
          .from('terms_and_conditions')
          .insert({
            version: '1.0',
            title: 'Règlement Intérieur – Wild Energy',
            content: `# Règlement Intérieur – Wild Energy

Le présent règlement s'applique à tous les élèves et visiteurs du Studio. Il vise à garantir la sécurité, le respect et la bonne organisation des activités.

---

## Article 1 – Accès et ponctualité  
- Les élèves doivent arriver 10 minutes avant le début du cours.  
- Tout retard perturbe le déroulement du cours et peut justifier un refus d'accès.  
- L'accès au Studio est strictement réservé aux personnes inscrites.  

---

## Article 2 – Tenue et hygiène  
- Une tenue adaptée à la pole dance est obligatoire (short, brassière ou débardeur).  
- L'utilisation de crème, huile ou lotion corporelle est interdite le jour du cours (risque de glissade).  
- Les élèves doivent se présenter avec une hygiène corporelle appropriée.  
- Les chaussures de ville sont interdites dans la salle, des chaussures propres ou pieds nus sont requis.  

---

## Article 3 – Sécurité et matériel  
- Les consignes des professeurs doivent être respectées à tout moment.  
- L'utilisation du matériel (barres, tapis, accessoires) se fait uniquement sous supervision.  
- Toute dégradation volontaire du matériel engage la responsabilité de l'élève.  
- Le Studio décline toute responsabilité en cas de vol ou perte d'objets personnels.  

---

## Article 4 – Respect et comportement  
- Le respect entre élèves et envers le personnel est une obligation.  
- Tout comportement agressif, discriminatoire ou inapproprié entraînera l'exclusion immédiate.  
- L'usage de stupéfiants et la consommation d'alcool sont strictement interdits dans l'enceinte du Studio.  

---

## Article 5 – Photos et vidéos personnelles  
- Les élèves ne sont pas autorisés à filmer ou photographier durant les cours sans l'accord du professeur et des autres participants.  
- Le partage de contenus sur les réseaux sociaux doit respecter le droit à l'image des autres élèves.  

---

## Article 6 – Sanctions  
Tout manquement au présent règlement intérieur pourra entraîner :  
1. Un avertissement oral ou écrit.  
2. L'exclusion temporaire ou définitive du Studio sans remboursement.  

---

## Article 7 – Acceptation  
Toute inscription au Studio implique l'acceptation du présent règlement intérieur, qui peut être mis à jour à tout moment.  

---`,
            term_type: 'interior_regulation',
            is_active: true,
            effective_date: new Date().toISOString()
          })
          .select();

        if (interiorRegulationError) throw interiorRegulationError;
        termsCreated++;
        console.log(`✅ Created interior regulation`);
      }
    } else {
      console.log(`✅ Found ${existingTerms.length} existing terms and conditions`);
    }
    
    // Get final count of all terms for summary
    const { data: finalTerms, error: finalTermsError } = await supabase
      .from('terms_and_conditions')
      .select('*');
    
    if (finalTermsError) throw finalTermsError;
    termsCreated = finalTerms.length;

    console.log('🎉 Data seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Groups: ${groups.length}`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Trainers: ${trainers.length}`);
    console.log(`   - Classes: ${classes.length}`);
    console.log(`   - Plans: ${plans.length}`);
    console.log(`   - Plan Groups: ${planGroups.length}`);
    console.log(`   - Schedules: ${createdSchedules.length}`);
    console.log(`   - Courses: ${createdCourses.length}`);
    console.log(`   - Terms & Conditions: ${termsCreated}`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedData();
