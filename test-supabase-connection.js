#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseConnection() {
  console.log('\n=== Testing Supabase Connection ===\n');

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const bucketName = process.env.SUPABASE_BUCKET || 'photos';

  console.log('1. Checking environment variables:');
  console.log('   SUPABASE_URL:', supabaseUrl ? `✓ Set (${supabaseUrl.substring(0, 30)}...)` : '✗ Missing');
  console.log('   SUPABASE_ANON_KEY:', supabaseAnonKey ? `✓ Set (${supabaseAnonKey.substring(0, 20)}...)` : '✗ Missing');
  console.log('   SUPABASE_BUCKET:', bucketName);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('\n❌ Missing required environment variables!');
    console.log('\nPlease ensure your .env.local file contains:');
    console.log('SUPABASE_URL=your_project_url');
    console.log('SUPABASE_ANON_KEY=your_anon_key');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('\n2. Supabase client created successfully');

  // Test bucket access
  console.log('\n3. Testing bucket access:');
  console.log(`   Attempting to list files in bucket: '${bucketName}'`);
  
  const { data: listData, error: listError } = await supabase.storage
    .from(bucketName)
    .list('', { limit: 5 });

  if (listError) {
    console.error(`   ✗ Error listing files: ${listError.message}`);
    console.log('\n   Possible issues:');
    console.log('   - Bucket "photos" does not exist');
    console.log('   - Bucket exists but RLS policies are not configured');
    console.log('   - Invalid credentials');
  } else {
    console.log(`   ✓ Successfully accessed bucket`);
    console.log(`   Files found: ${listData?.length || 0}`);
  }

  // List all buckets (requires service role key)
  console.log('\n4. Listing all buckets:');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.log(`   ⚠ Cannot list buckets (requires service role key): ${bucketsError.message}`);
  } else {
    console.log(`   ✓ Found ${buckets?.length || 0} bucket(s)`);
    buckets?.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
  }

  // Test upload capability
  console.log('\n5. Testing upload capability:');
  const testFileName = `test-${Date.now()}.txt`;
  const testContent = Buffer.from('Test upload from Make It Snap');
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(testFileName, testContent, {
      contentType: 'text/plain',
      upsert: false
    });

  if (uploadError) {
    console.error(`   ✗ Upload test failed: ${uploadError.message}`);
    console.log('\n   Possible issues:');
    console.log('   - Missing INSERT policy for anonymous users');
    console.log('   - Bucket is set to private instead of public');
    console.log('   - RLS is not enabled on storage.objects table');
  } else {
    console.log(`   ✓ Upload test successful`);
    console.log(`   File path: ${uploadData.path}`);
    
    // Try to get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(testFileName);
    
    console.log(`   Public URL: ${urlData?.publicUrl || 'Not available'}`);
    
    // Clean up test file
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([testFileName]);
    
    if (deleteError) {
      console.log(`   ⚠ Could not delete test file: ${deleteError.message}`);
    } else {
      console.log(`   ✓ Test file cleaned up`);
    }
  }

  console.log('\n=== Summary ===\n');
  
  if (!listError && !uploadError) {
    console.log('✅ Supabase is properly configured and working!');
  } else {
    console.log('❌ Issues detected with Supabase configuration');
    console.log('\nTo fix:');
    console.log('1. Ensure the "photos" bucket exists in Supabase Storage');
    console.log('2. Make sure the bucket is set to PUBLIC');
    console.log('3. Run the SQL policies from setup-supabase-storage.sql');
    console.log('4. Or use the Supabase dashboard to create policies manually');
  }
}

testSupabaseConnection().catch(console.error);