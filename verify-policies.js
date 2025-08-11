#!/usr/bin/env node

/**
 * Supabase Storage Policies Verification Script
 * This script helps verify that your storage bucket policies are correctly configured
 */

require('dotenv').config({ path: '.env.local' });
const { supabase } = require('./lib/supabase');

async function verifyPolicies() {
  console.log('🔒 Verifying Supabase Storage Policies...\n');
  
  try {
    // Test 1: Check if bucket exists and is public
    console.log('1️⃣  Checking bucket configuration...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError.message);
      return false;
    }
    
    const photoBucket = buckets?.find(b => b.name === 'photos');
    if (!photoBucket) {
      console.log('❌ "photos" bucket not found!');
      console.log('   Available buckets:', buckets?.map(b => b.name).join(', ') || 'none');
      return false;
    }
    
    console.log('✅ "photos" bucket exists');
    console.log('   Public bucket:', photoBucket.public ? '✅ Yes' : '❌ No (must be public!)');
    
    if (!photoBucket.public) {
      console.log('   🔧 To fix: In Supabase dashboard → Storage → photos bucket → Settings → Make public');
    }
    
    // Test 2: Verify SELECT policy (anonymous viewing)
    console.log('\n2️⃣  Testing SELECT policy (anonymous viewing)...');
    
    try {
      const { data: files, error: listError } = await supabase.storage
        .from('photos')
        .list('', { limit: 1 });
      
      if (listError) {
        if (listError.message.includes('policy')) {
          console.log('❌ SELECT policy missing or incorrect');
          console.log('   Error:', listError.message);
          console.log('   🔧 Need to create policy: Allow anon users to SELECT from photos bucket');
        } else {
          console.log('⚠️  SELECT test inconclusive:', listError.message);
        }
      } else {
        console.log('✅ SELECT policy working - anonymous users can view');
      }
    } catch (selectError) {
      console.log('❌ SELECT policy test failed:', selectError.message);
    }
    
    // Test 3: Verify INSERT policy (anonymous uploads)  
    console.log('\n3️⃣  Testing INSERT policy (anonymous uploads)...');
    
    try {
      // Create a tiny test image
      const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      const base64Data = testImageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const testFileName = `policy-test-${Date.now()}.png`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(testFileName, buffer, {
          contentType: 'image/png',
          upsert: false
        });
      
      if (uploadError) {
        if (uploadError.message.includes('policy')) {
          console.log('❌ INSERT policy missing or incorrect');
          console.log('   Error:', uploadError.message);
          console.log('   🔧 Need to create policy: Allow anon users to INSERT into photos bucket');
        } else {
          console.log('❌ INSERT policy test failed:', uploadError.message);
        }
      } else {
        console.log('✅ INSERT policy working - anonymous users can upload');
        console.log('   Test file uploaded:', uploadData.path);
        
        // Clean up test file
        const { error: deleteError } = await supabase.storage
          .from('photos')
          .remove([testFileName]);
        
        if (!deleteError) {
          console.log('   ✅ Test file cleaned up');
        }
      }
    } catch (insertError) {
      console.log('❌ INSERT policy test failed:', insertError.message);
    }
    
    console.log('\n📋 REQUIRED POLICIES SUMMARY:');
    console.log('   Policy 1: "Allow anonymous uploads"');
    console.log('     • Target roles: anon');
    console.log('     • Allowed operations: INSERT');
    console.log('   Policy 2: "Allow anonymous viewing"'); 
    console.log('     • Target roles: anon');
    console.log('     • Allowed operations: SELECT');
    
    console.log('\n🔧 TO CREATE POLICIES:');
    console.log('   1. Go to Supabase dashboard → Storage');
    console.log('   2. Click on "photos" bucket');
    console.log('   3. Click "Policies" tab');
    console.log('   4. Click "New Policy" for each policy above');
    
    console.log('\n✅ Policy verification complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error during verification:', error.message);
    return false;
  }
}

// Check environment variables first
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('❌ Supabase environment variables not configured!');
  console.log('   Please set up your .env.local file first.');
  console.log('   Run: node setup-supabase-guide.js --help');
  process.exit(1);
}

verifyPolicies();