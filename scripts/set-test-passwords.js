const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setTestPasswords() {
  console.log('🔐 Setting test user passwords...');
  
  // First, let's see what users exist in Supabase Auth
  console.log('📋 Checking existing users in Supabase Auth...');
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listing users:', listError.message);
    return;
  }
  
  console.log(`Found ${users.length} users in Supabase Auth:`);
  users.forEach(user => {
    console.log(`  - ${user.email} (${user.id})`);
  });
  
  const testUsers = [
    { email: 'admin@wildenergy.tn', password: 'password123' },
    { email: 'sophie.admin@wildenergy.tn', password: 'password123' },
    { email: 'manager@wildenergy.tn', password: 'password123' },
    { email: 'john.member@email.com', password: 'password123' },
    { email: 'maria.member@email.com', password: 'password123' },
    { email: 'mike.trainer@wildenergy.tn', password: 'password123' },
    { email: 'sarah.trainer@wildenergy.tn', password: 'password123' },
    { email: 'alex.hybrid@email.com', password: 'password123' }
  ];

  for (const testUser of testUsers) {
    try {
      console.log(`\nSetting password for ${testUser.email}...`);
      
      // Find the user by email
      const authUser = users.find(u => u.email === testUser.email);
      if (!authUser) {
        console.log(`⚠️  ${testUser.email}: User not found in Supabase Auth`);
        continue;
      }
      
      const { data, error } = await supabase.auth.admin.updateUserById(
        authUser.id,
        {
          password: testUser.password,
          email_confirm: true
        }
      );

      if (error) {
        console.log(`⚠️  ${testUser.email}: ${error.message}`);
      } else {
        console.log(`✅ ${testUser.email}: Password set successfully`);
      }
    } catch (err) {
      console.log(`❌ ${testUser.email}: ${err.message}`);
    }
  }

  console.log('\n🎉 Password setting complete!');
}

setTestPasswords().catch(console.error);
