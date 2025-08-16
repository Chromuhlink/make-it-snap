#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testBucketAccess() {
  console.log('\n=== Testing Supabase Bucket Access ===\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // List all buckets
  console.log('1. Listing all buckets:');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.log('   Cannot list buckets (requires service role):', bucketsError.message);
  } else {
    console.log('   Found buckets:', buckets?.map(b => b.name).join(', ') || 'none');
  }

  // Check if photos bucket exists by trying to list files
  console.log('\n2. Checking "photos" bucket:');
  const { data: files, error: filesError } = await supabase.storage
    .from('photos')
    .list();

  if (filesError) {
    console.log('   ❌ Error accessing photos bucket:', filesError.message);
    
    // Try to create the bucket
    console.log('\n3. Attempting to create "photos" bucket:');
    const { data: createData, error: createError } = await supabase.storage.createBucket('photos', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    });
    
    if (createError) {
      console.log('   ❌ Cannot create bucket:', createError.message);
      console.log('   You need to create it manually in Supabase dashboard');
    } else {
      console.log('   ✅ Bucket created successfully!');
    }
  } else {
    console.log('   ✅ Photos bucket exists and is accessible');
    console.log('   Files in bucket:', files?.length || 0);
  }

  // Test getting a public URL
  console.log('\n4. Testing public URL generation:');
  const testFile = 'test-file.txt';
  const { data: urlData } = supabase.storage
    .from('photos')
    .getPublicUrl(testFile);
  
  console.log('   Generated URL:', urlData?.publicUrl);
  
  // Check if the URL structure is correct
  if (urlData?.publicUrl) {
    const expectedPattern = `${supabaseUrl}/storage/v1/object/public/photos/`;
    if (urlData.publicUrl.includes(expectedPattern)) {
      console.log('   ✅ URL structure looks correct');
    } else {
      console.log('   ⚠️  URL structure might be incorrect');
      console.log('   Expected pattern:', expectedPattern);
    }
  }

  // Test the actual bucket info via direct API call
  console.log('\n5. Testing direct API access to bucket:');
  try {
    const response = await fetch(`${supabaseUrl}/storage/v1/object/public/photos/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey
      }
    });
    
    console.log('   API Response status:', response.status);
    if (response.status === 400 || response.status === 404) {
      const text = await response.text();
      console.log('   Response:', text);
      console.log('\n   ⚠️  The bucket might not be PUBLIC!');
      console.log('   To fix: Go to Supabase dashboard > Storage > photos bucket > Settings');
      console.log('   Make sure "Public bucket" is toggled ON');
    }
  } catch (e) {
    console.log('   Error testing API:', e.message);
  }
}

testBucketAccess().catch(console.error);