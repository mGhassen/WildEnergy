#!/usr/bin/env node

/**
 * Script to fix admin API authentication issues
 * Updates all admin APIs to use email-based lookup instead of account_id
 */

const fs = require('fs');
const path = require('path');

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
    
    // Check if file contains the problematic pattern
    if (content.includes('.eq(\'account_id\', adminUser.id)') || content.includes('.eq(\'account_id\', user.id)')) {
      console.log(`Updating: ${filePath}`);
      
      let updatedContent = content;
      
      // Replace account_id lookups with email lookups
      updatedContent = updatedContent
        .replace(/\.eq\('account_id', adminUser\.id\)/g, ".eq('email', adminUser.email)")
        .replace(/\.eq\('account_id', user\.id\)/g, ".eq('email', user.email)")
        .replace(/\.eq\('account_id', authUser\.id\)/g, ".eq('email', authUser.email)");
      
      if (updatedContent !== content) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`✅ Updated: ${filePath}`);
        return true;
      } else {
        console.log(`⏭️  No changes needed: ${filePath}`);
        return false;
      }
    } else {
      console.log(`⏭️  Skipping (no account_id pattern): ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
function main() {
  console.log('🔧 Fixing admin API authentication issues...');
  console.log('=' .repeat(50));
  
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
