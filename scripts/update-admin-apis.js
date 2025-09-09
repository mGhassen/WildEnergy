#!/usr/bin/env node

/**
 * Script to update admin APIs to use the new user system
 * This script will find and replace the old admin check pattern with the new one
 */

const fs = require('fs');
const path = require('path');

// Pattern to find and replace
const oldAdminCheckPattern = /\/\/ Verify admin\s*\n\s*const \{ data: \{ user: adminUser \}, error: authError \} = await supabaseServer\(\)\.auth\.getUser\(token\);\s*\n\s*if \(authError \|\| !adminUser\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'Invalid or expired token' \}, \{ status: 401 \}\);\s*\n\s*\}\s*\n\s*const \{ data: adminCheck \} = await supabaseServer\(\)\s*\n\s*\.from\('users'\)\s*\n\s*\.select\('is_admin'\)\s*\n\s*\.eq\('auth_user_id', adminUser\.id\)\s*\n\s*\.single\(\);\s*\n\s*if \(!adminCheck\?\.is_admin\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'Admin access required' \}, \{ status: 403 \}\);\s*\n\s*\}/g;

const newAdminCheckPattern = `// Verify admin using new user system
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('account_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }`;

// Find all admin API files
function findAdminApiFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findAdminApiFiles(fullPath));
    } else if (item.endsWith('.ts') && item === 'route.ts') {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Update a single file
function updateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file contains the old pattern
    if (content.includes("from('users')") && content.includes('auth_user_id')) {
      console.log(`Updating: ${filePath}`);
      
      // Replace the admin check pattern
      const updatedContent = content.replace(oldAdminCheckPattern, newAdminCheckPattern);
      
      // Also replace any remaining old patterns
      const finalContent = updatedContent
        .replace(/\.from\('users'\)/g, ".from('user_profiles')")
        .replace(/\.eq\('auth_user_id', adminUser\.id\)/g, ".eq('account_id', adminUser.id)")
        .replace(/\.eq\('auth_user_id', user\.id\)/g, ".eq('account_id', user.id)")
        .replace(/\.eq\('auth_user_id', authUser\.id\)/g, ".eq('account_id', authUser.id)")
        .replace(/\.eq\('auth_user_id', adminUser\.id\)/g, ".eq('account_id', adminUser.id)");
      
      if (finalContent !== content) {
        fs.writeFileSync(filePath, finalContent, 'utf8');
        console.log(`✅ Updated: ${filePath}`);
        return true;
      } else {
        console.log(`⏭️  No changes needed: ${filePath}`);
        return false;
      }
    } else {
      console.log(`⏭️  Skipping (no old patterns): ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
function main() {
  console.log('🔍 Finding admin API files...');
  
  const adminApiDir = path.join(process.cwd(), 'src/app/api/admin');
  const files = findAdminApiFiles(adminApiDir);
  
  console.log(`Found ${files.length} admin API files`);
  
  let updatedCount = 0;
  
  for (const file of files) {
    if (updateFile(file)) {
      updatedCount++;
    }
  }
  
  console.log(`\n🎉 Updated ${updatedCount} files out of ${files.length} total files`);
}

if (require.main === module) {
  main();
}

module.exports = { updateFile, findAdminApiFiles };
