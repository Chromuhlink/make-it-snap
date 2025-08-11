#!/usr/bin/env node

/**
 * Supabase Setup Guide and Verification Script
 * This script helps you set up and verify your Supabase storage configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Supabase Storage Setup Guide for Photo Gallery App\n');

// Check if environment file exists and has correct structure
function checkEnvironmentFile() {
  const envPath = path.join(__dirname, '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local file not found');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasSupabaseUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL=');
  const hasSupabaseKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=');
  
  console.log('📁 Environment file check:');
  console.log('  ✓ .env.local exists');
  console.log('  ' + (hasSupabaseUrl ? '✓' : '❌') + ' NEXT_PUBLIC_SUPABASE_URL defined');
  console.log('  ' + (hasSupabaseKey ? '✓' : '❌') + ' NEXT_PUBLIC_SUPABASE_ANON_KEY defined');
  
  // Check if they're still placeholder values
  const hasPlaceholderUrl = envContent.includes('https://your-project-id.supabase.co');
  const hasPlaceholderKey = envContent.includes('your_supabase_anon_key_here');
  
  if (hasPlaceholderUrl || hasPlaceholderKey) {
    console.log('  ⚠️  Still using placeholder values - need to update with real credentials\n');
    return false;
  }
  
  return hasSupabaseUrl && hasSupabaseKey;
}

function printSetupInstructions() {
  console.log('📋 SETUP INSTRUCTIONS:\n');
  
  console.log('1️⃣  CREATE SUPABASE PROJECT:');
  console.log('   • Go to https://supabase.com');
  console.log('   • Sign up/login and create a new project');
  console.log('   • Wait for project to initialize (2-3 minutes)\n');
  
  console.log('2️⃣  GET YOUR CREDENTIALS:');
  console.log('   • In your project dashboard: Settings → API');
  console.log('   • Copy "Project URL" (looks like: https://abcdef12345.supabase.co)');
  console.log('   • Copy "anon public" key (long string starting with eyJ...)\n');
  
  console.log('3️⃣  CREATE STORAGE BUCKET:');
  console.log('   • Go to Storage section in dashboard');
  console.log('   • Click "New bucket"');
  console.log('   • Name: "photos" (exactly this name)');
  console.log('   • ⚠️  IMPORTANT: Toggle "Public bucket" to ON (green)');
  console.log('   • Click "Create bucket"\n');
  
  console.log('4️⃣  SET UP STORAGE POLICIES:');
  console.log('   • Click on your "photos" bucket');
  console.log('   • Go to "Policies" tab');
  console.log('   • Click "New Policy" and create these TWO policies:\n');
  
  console.log('   Policy #1 - Allow Anonymous Uploads:');
  console.log('   • Policy name: "Allow anonymous uploads"');
  console.log('   • Target roles: Check "anon"');
  console.log('   • Allowed operations: Check "INSERT"');
  console.log('   • Save policy\n');
  
  console.log('   Policy #2 - Allow Anonymous Viewing:');
  console.log('   • Policy name: "Allow anonymous viewing"');
  console.log('   • Target roles: Check "anon"');
  console.log('   • Allowed operations: Check "SELECT"');
  console.log('   • Save policy\n');
  
  console.log('5️⃣  UPDATE ENVIRONMENT VARIABLES:');
  console.log('   • Edit .env.local file in your project');
  console.log('   • Replace placeholder values with your real credentials:');
  console.log('     NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project.supabase.co');
  console.log('     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key\n');
  
  console.log('6️⃣  TEST YOUR SETUP:');
  console.log('   • Run: node test-supabase.js');
  console.log('   • All tests should pass ✅\n');
}

function printCurrentStatus() {
  console.log('📊 CURRENT STATUS:\n');
  
  const envConfigured = checkEnvironmentFile();
  
  console.log('📁 Project Files:');
  const requiredFiles = [
    '.env.local',
    'lib/supabase.js', 
    'api/upload.js',
    'api/gallery.js',
    'test-supabase.js'
  ];
  
  requiredFiles.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, file));
    console.log('  ' + (exists ? '✓' : '❌') + ' ' + file);
  });
  
  console.log('\n🔧 Next Steps:');
  if (!envConfigured) {
    console.log('  1. Complete Supabase setup (see instructions above)');
    console.log('  2. Update .env.local with real credentials');
    console.log('  3. Run: node test-supabase.js');
  } else {
    console.log('  ✓ Environment configured');
    console.log('  → Run: node test-supabase.js to verify everything works');
  }
}

// Main execution
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printSetupInstructions();
} else {
  printCurrentStatus();
  console.log('\n💡 For detailed setup instructions, run: node setup-supabase-guide.js --help\n');
}

console.log('🎯 REQUIRED STORAGE CONFIGURATION SUMMARY:');
console.log('   • Bucket name: "photos"');
console.log('   • Bucket type: Public');
console.log('   • RLS Policies: Allow anon users to INSERT and SELECT');
console.log('   • Anonymous operations: Upload ✓ | View ✓\n');