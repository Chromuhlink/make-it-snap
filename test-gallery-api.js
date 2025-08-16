#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

async function testGalleryAPI() {
  console.log('\n=== Testing Gallery API ===\n');

  // Import the handler
  const handler = require('./api/gallery.js');
  
  console.log('1. Creating mock request/response objects...');
  
  // Create mock request
  const mockReq = {
    method: 'GET',
    headers: {
      origin: 'http://localhost:3000'
    }
  };
  
  // Create mock response
  let statusCode = null;
  let responseData = null;
  const headers = {};
  
  const mockRes = {
    status: (code) => {
      statusCode = code;
      return mockRes;
    },
    setHeader: (key, value) => {
      headers[key] = value;
      return mockRes;
    },
    json: (data) => {
      responseData = data;
      return mockRes;
    },
    end: () => {
      return mockRes;
    }
  };
  
  console.log('2. Calling gallery handler...\n');
  
  try {
    await handler(mockReq, mockRes);
    
    console.log('\n=== Response ===');
    console.log('Status:', statusCode);
    console.log('Photo count:', responseData?.count || 0);
    
    if (responseData?.photos && responseData.photos.length > 0) {
      console.log('\nFirst 3 photos:');
      responseData.photos.slice(0, 3).forEach((photo, i) => {
        console.log(`\nPhoto ${i + 1}:`);
        console.log('  Filename:', photo.filename);
        console.log('  URL:', photo.url);
        console.log('  Uploaded:', photo.uploadedAt);
        
        // Check if URL looks valid
        if (!photo.url || photo.url === 'undefined' || !photo.url.startsWith('http')) {
          console.log('  ⚠️  WARNING: Invalid URL format!');
        }
      });
    }
    
    if (statusCode === 200 && responseData?.success) {
      console.log('\n✅ Gallery API test successful!');
      
      // Test if the first image URL is actually accessible
      if (responseData.photos.length > 0) {
        const firstPhotoUrl = responseData.photos[0].url;
        console.log('\n3. Testing if first image URL is accessible...');
        console.log('   URL:', firstPhotoUrl);
        
        try {
          const response = await fetch(firstPhotoUrl, { method: 'HEAD' });
          if (response.ok) {
            console.log('   ✅ Image URL is accessible (status:', response.status + ')');
          } else {
            console.log('   ❌ Image URL returned status:', response.status);
          }
        } catch (e) {
          console.log('   ❌ Could not access image URL:', e.message);
        }
      }
    } else {
      console.log('\n❌ Gallery API test failed');
      console.log('Error:', responseData?.error || 'Unknown error');
    }
  } catch (error) {
    console.error('\n❌ Gallery API test threw an error:');
    console.error(error);
  }
}

testGalleryAPI().catch(console.error);