#!/usr/bin/env node

/**
 * Seed data script for Wild Energy platform
 * This script properly seeds the database with all required data including
 * schedules with proper start_date and end_date values to satisfy constraints
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        // Create account
        const { data: account, error: accountError } = await supabase
          .from('accounts')
          .insert({
            email: trainer.email,
            status: 'active'
          })
          .select()
          .single();
        
        if (accountError) throw accountError;
        
        // Create profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: account.id,
            first_name: trainer.firstName,
            last_name: trainer.lastName,
            phone: trainer.phone,
            address: trainer.address,
            profession: trainer.profession
          })
          .select()
          .single();
        
        if (profileError) throw profileError;
        
        // Create trainer record
        const { data: trainerRecord, error: trainerError } = await supabase
          .from('trainers')
          .insert({
            account_id: account.id,
            profile_id: account.id,
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
        { name: 'Yoga Flow', description: 'Vinyasa yoga for all levels', category_id: categories[0].id, duration: 60, max_capacity: 18, equipment: 'Yoga mat', difficulty: 'beginner', is_active: true },
        { name: 'Yoga Advanced', description: 'Advanced yoga poses and sequences', category_id: categories[0].id, duration: 75, max_capacity: 12, equipment: 'Yoga mat, blocks', difficulty: 'advanced', is_active: true },
        { name: 'Cardio Blast', description: 'High-intensity interval training', category_id: categories[1].id, duration: 45, max_capacity: 25, equipment: 'None', difficulty: 'intermediate', is_active: true },
        { name: 'HIIT Challenge', description: 'Extreme high-intensity workout', category_id: categories[1].id, duration: 30, max_capacity: 20, equipment: 'Kettlebells', difficulty: 'advanced', is_active: true },
        { name: 'Strength Circuit', description: 'Strength and conditioning circuit', category_id: categories[2].id, duration: 60, max_capacity: 16, equipment: 'Dumbbells, resistance bands', difficulty: 'intermediate', is_active: true },
        { name: 'Powerlifting Basics', description: 'Introduction to powerlifting techniques', category_id: categories[2].id, duration: 90, max_capacity: 8, equipment: 'Barbells, plates', difficulty: 'beginner', is_active: true },
        { name: 'Pilates Core', description: 'Pilates class focused on core strength', category_id: categories[3].id, duration: 50, max_capacity: 14, equipment: 'Mat, ring', difficulty: 'beginner', is_active: true },
        { name: 'Pilates Advanced', description: 'Advanced Pilates with equipment', category_id: categories[3].id, duration: 60, max_capacity: 10, equipment: 'Reformer, chair', difficulty: 'advanced', is_active: true },
        { name: 'Pole Dance Beginner', description: 'Introduction to pole dancing', category_id: categories[4].id, duration: 60, max_capacity: 12, equipment: 'Pole', difficulty: 'beginner', is_active: true },
        { name: 'Pole Dance Intermediate', description: 'Intermediate pole techniques', category_id: categories[4].id, duration: 75, max_capacity: 10, equipment: 'Pole', difficulty: 'intermediate', is_active: true },
        { name: 'Flexibility Flow', description: 'Deep stretching and mobility', category_id: categories[5].id, duration: 45, max_capacity: 20, equipment: 'Mat, straps', difficulty: 'beginner', is_active: true },
        { name: 'Salsa Basics', description: 'Learn basic salsa steps', category_id: categories[6].id, duration: 60, max_capacity: 15, equipment: 'None', difficulty: 'beginner', is_active: true },
        { name: 'Bachata Sensual', description: 'Sensual bachata dancing', category_id: categories[6].id, duration: 60, max_capacity: 12, equipment: 'None', difficulty: 'intermediate', is_active: true },
        { name: 'Kickboxing', description: 'High-energy martial arts workout', category_id: categories[7].id, duration: 50, max_capacity: 18, equipment: 'Gloves, pads', difficulty: 'intermediate', is_active: true },
        { name: 'Self-Defense', description: 'Practical self-defense techniques', category_id: categories[7].id, duration: 60, max_capacity: 15, equipment: 'Pads, dummy', difficulty: 'beginner', is_active: true },
        { name: 'Meditation Circle', description: 'Guided meditation and mindfulness', category_id: categories[8].id, duration: 30, max_capacity: 25, equipment: 'Cushions', difficulty: 'beginner', is_active: true },
        { name: 'Breathing Workshop', description: 'Breathing exercises and relaxation', category_id: categories[9].id, duration: 45, max_capacity: 20, equipment: 'Mats, blankets', difficulty: 'beginner', is_active: true }
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
      { class_id: classes[0].id, trainer_id: getTrainerId(0), start_time: '08:00', end_time: '09:00', day_of_week: 1, repetition_type: 'weekly', max_participants: 18, code: 'SCH-0001', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[2].id, trainer_id: getTrainerId(1), start_time: '09:30', end_time: '10:15', day_of_week: 1, repetition_type: 'weekly', max_participants: 25, code: 'SCH-0002', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[4].id, trainer_id: getTrainerId(2), start_time: '18:00', end_time: '19:00', day_of_week: 1, repetition_type: 'weekly', max_participants: 16, code: 'SCH-0003', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[8].id, trainer_id: getTrainerId(3), start_time: '19:30', end_time: '20:30', day_of_week: 1, repetition_type: 'weekly', max_participants: 12, code: 'SCH-0004', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      
      // Tuesday schedules
      { class_id: classes[1].id, trainer_id: getTrainerId(0), start_time: '07:00', end_time: '08:15', day_of_week: 2, repetition_type: 'weekly', max_participants: 12, code: 'SCH-0005', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[3].id, trainer_id: getTrainerId(1), start_time: '09:00', end_time: '09:30', day_of_week: 2, repetition_type: 'weekly', max_participants: 20, code: 'SCH-0006', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[6].id, trainer_id: getTrainerId(0), start_time: '17:00', end_time: '17:50', day_of_week: 2, repetition_type: 'weekly', max_participants: 14, code: 'SCH-0007', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[10].id, trainer_id: getTrainerId(2), start_time: '18:30', end_time: '19:15', day_of_week: 2, repetition_type: 'weekly', max_participants: 20, code: 'SCH-0008', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      
      // Wednesday schedules
      { class_id: classes[5].id, trainer_id: getTrainerId(2), start_time: '08:00', end_time: '09:30', day_of_week: 3, repetition_type: 'weekly', max_participants: 8, code: 'SCH-0009', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[11].id, trainer_id: getTrainerId(0), start_time: '10:00', end_time: '11:00', day_of_week: 3, repetition_type: 'weekly', max_participants: 15, code: 'SCH-0010', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[13].id, trainer_id: getTrainerId(1), start_time: '18:00', end_time: '18:50', day_of_week: 3, repetition_type: 'weekly', max_participants: 18, code: 'SCH-0011', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[15].id, trainer_id: getTrainerId(3), start_time: '19:30', end_time: '20:00', day_of_week: 3, repetition_type: 'weekly', max_participants: 25, code: 'SCH-0012', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      
      // Thursday schedules
      { class_id: classes[0].id, trainer_id: getTrainerId(0), start_time: '08:00', end_time: '09:00', day_of_week: 4, repetition_type: 'weekly', max_participants: 18, code: 'SCH-0013', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[7].id, trainer_id: getTrainerId(0), start_time: '10:00', end_time: '11:00', day_of_week: 4, repetition_type: 'weekly', max_participants: 10, code: 'SCH-0014', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[9].id, trainer_id: getTrainerId(3), start_time: '17:00', end_time: '18:15', day_of_week: 4, repetition_type: 'weekly', max_participants: 10, code: 'SCH-0015', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[12].id, trainer_id: getTrainerId(0), start_time: '18:30', end_time: '19:30', day_of_week: 4, repetition_type: 'weekly', max_participants: 12, code: 'SCH-0016', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      
      // Friday schedules
      { class_id: classes[2].id, trainer_id: getTrainerId(1), start_time: '08:30', end_time: '09:15', day_of_week: 5, repetition_type: 'weekly', max_participants: 25, code: 'SCH-0017', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[4].id, trainer_id: getTrainerId(2), start_time: '10:00', end_time: '11:00', day_of_week: 5, repetition_type: 'weekly', max_participants: 16, code: 'SCH-0018', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[14].id, trainer_id: getTrainerId(1), start_time: '17:00', end_time: '18:00', day_of_week: 5, repetition_type: 'weekly', max_participants: 15, code: 'SCH-0019', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[16].id, trainer_id: getTrainerId(3), start_time: '18:30', end_time: '19:15', day_of_week: 5, repetition_type: 'weekly', max_participants: 20, code: 'SCH-0020', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      
      // Saturday schedules
      { class_id: classes[0].id, trainer_id: getTrainerId(0), start_time: '09:00', end_time: '10:00', day_of_week: 6, repetition_type: 'weekly', max_participants: 18, code: 'SCH-0021', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[8].id, trainer_id: getTrainerId(3), start_time: '10:30', end_time: '11:30', day_of_week: 6, repetition_type: 'weekly', max_participants: 12, code: 'SCH-0022', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[11].id, trainer_id: getTrainerId(0), start_time: '12:00', end_time: '13:00', day_of_week: 6, repetition_type: 'weekly', max_participants: 15, code: 'SCH-0023', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[10].id, trainer_id: getTrainerId(2), start_time: '14:00', end_time: '14:45', day_of_week: 6, repetition_type: 'weekly', max_participants: 20, code: 'SCH-0024', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      
      // Sunday schedules
      { class_id: classes[1].id, trainer_id: getTrainerId(0), start_time: '09:00', end_time: '10:15', day_of_week: 0, repetition_type: 'weekly', max_participants: 12, code: 'SCH-0025', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[6].id, trainer_id: getTrainerId(0), start_time: '10:30', end_time: '11:20', day_of_week: 0, repetition_type: 'weekly', max_participants: 14, code: 'SCH-0026', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[15].id, trainer_id: getTrainerId(3), start_time: '11:30', end_time: '12:00', day_of_week: 0, repetition_type: 'weekly', max_participants: 25, code: 'SCH-0027', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) },
      { class_id: classes[13].id, trainer_id: getTrainerId(1), start_time: '16:00', end_time: '16:50', day_of_week: 0, repetition_type: 'weekly', max_participants: 18, code: 'SCH-0028', is_active: true, start_date: formatDate(startDate), end_date: formatDate(endDate) }
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

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedData();
