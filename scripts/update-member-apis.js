#!/usr/bin/env node

/**
 * Script to update member APIs to use the new user system
 * This script will find and replace the old user patterns with the new member system
 */

const fs = require('fs');
const path = require('path');

// Find all member API files
function findMemberApiFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findMemberApiFiles(fullPath));
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
    
    // Check if file contains old patterns
    if (content.includes("from('users')") || content.includes('auth_user_id') || content.includes('user_id')) {
      console.log(`Updating: ${filePath}`);
      
      let updatedContent = content;
      
      // Replace user table references with user_profiles
      updatedContent = updatedContent
        .replace(/\.from\('users'\)/g, ".from('user_profiles')")
        .replace(/\.eq\('auth_user_id', [^)]+\)/g, (match) => {
          const userId = match.match(/\.eq\('auth_user_id', ([^)]+)\)/)[1];
          return `.eq('account_id', ${userId})`;
        })
        .replace(/\.eq\('user_id', [^)]+\)/g, (match) => {
          const userId = match.match(/\.eq\('user_id', ([^)]+)\)/)[1];
          return `.eq('member_id', ${userId})`;
        });
      
      // Update specific field references
      updatedContent = updatedContent
        .replace(/\.select\('is_admin'\)/g, ".select('is_admin, accessible_portals')")
        .replace(/\.eq\('id', [^)]+\)/g, (match) => {
          // This is tricky - we need to be more specific about which 'id' field
          // For now, let's be conservative and only update obvious cases
          return match;
        });
      
      if (updatedContent !== content) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
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
  console.log('🔍 Finding member API files...');
  
  const memberApiDir = path.join(process.cwd(), 'src/app/api/member');
  const files = findMemberApiFiles(memberApiDir);
  
  console.log(`Found ${files.length} member API files`);
  
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

module.exports = { updateFile, findMemberApiFiles };
