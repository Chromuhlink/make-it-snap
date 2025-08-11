#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { supabase } = require('./lib/supabase');

async function testSupabase() {
  console.log('Testing Supabase connection...\n');
  
  // Check environment variables
  console.log('Environment variables:');
  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing');
  console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing');
  console.log('');
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase environment variables!');
    console.log('\nPlease ensure you have a .env.local file with:');
    console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key');
    process.exit(1);
  }
  
  try {
    // Test 1: Check if the photos bucket exists
    console.log('Test 1: Checking if "photos" bucket exists...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError.message);
    } else {
      const photoBucket = buckets?.find(b => b.name === 'photos');
      if (photoBucket) {
        console.log('✓ "photos" bucket exists');
        console.log('  Public:', photoBucket.public ? 'Yes' : 'No (WARNING: Should be public!)');
      } else {
        console.log('❌ "photos" bucket does not exist!');
        console.log('  Available buckets:', buckets?.map(b => b.name).join(', ') || 'none');
        console.log('\nTo fix: Create a bucket named "photos" in your Supabase dashboard');
      }
    }
    
    // Test 2: List files in photos bucket
    console.log('\nTest 2: Listing files in "photos" bucket...');
    const { data: files, error: listError } = await supabase.storage
      .from('photos')
      .list('', {
        limit: 5,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (listError) {
      console.error('❌ Error listing files:', listError.message);
      if (listError.message.includes('not found')) {
        console.log('\n⚠️  The "photos" bucket does not exist.');
        console.log('Please create it in your Supabase dashboard:');
        console.log('1. Go to Storage section');
        console.log('2. Click "New bucket"');
        console.log('3. Name it "photos"');
        console.log('4. Make sure "Public bucket" is ON');
      }
    } else {
      console.log(`✓ Found ${files?.length || 0} files in bucket`);
      if (files && files.length > 0) {
        console.log('  Recent files:');
        files.slice(0, 3).forEach(file => {
          console.log(`    - ${file.name} (${new Date(file.created_at).toLocaleString()})`);
        });
      }
    }
    
    // Test 3: Test upload capability (with small test image)
    console.log('\nTest 3: Testing upload capability...');
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const base64Data = testImageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const testFileName = `test-${Date.now()}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(testFileName, buffer, {
        contentType: 'image/png',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError.message);
      if (uploadError.message.includes('not found')) {
        console.log('  The bucket does not exist or is not accessible');
      } else if (uploadError.message.includes('policy')) {
        console.log('  Storage policies may need to be configured');
      }
    } else {
      console.log('✓ Upload test successful!');
      console.log('  File path:', uploadData.path);
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(testFileName);
      console.log('  Public URL:', publicUrl);
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('photos')
        .remove([testFileName]);
      
      if (!deleteError) {
        console.log('  ✓ Test file cleaned up');
      }
    }
    
    // Test 4: Check RLS policies
    console.log('\nTest 4: Checking storage policies...');
    console.log('ℹ️  Make sure your bucket has the following RLS policies:');
    console.log('  - SELECT: Allow anonymous users (for viewing)');
    console.log('  - INSERT: Allow anonymous users (for uploading)');
    console.log('  - You can set these in Storage > Policies in Supabase dashboard');
    
    console.log('\n✅ Supabase connection test complete!');
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

testSupabase();