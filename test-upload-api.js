#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Create a small test image (1x1 pixel red PNG)
const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

async function testUploadAPI() {
  console.log('\n=== Testing Upload API ===\n');

  // Test locally with Node.js (simulating the Vercel environment)
  console.log('1. Loading environment variables...');
  require('dotenv').config({ path: '.env.local' });
  
  // Import the handler
  const handler = require('./api/upload.js');
  
  console.log('2. Creating mock request/response objects...');
  
  // Create mock request
  const mockReq = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000'
    },
    body: {
      image: testImageBase64,
      filename: 'test-upload.png'
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
  
  console.log('3. Calling upload handler...\n');
  
  try {
    await handler(mockReq, mockRes);
    
    console.log('\n=== Response ===');
    console.log('Status:', statusCode);
    console.log('Headers:', headers);
    console.log('Data:', JSON.stringify(responseData, null, 2));
    
    if (statusCode === 200 && responseData?.success) {
      console.log('\n✅ Upload API test successful!');
      console.log('Image URL:', responseData.url);
    } else {
      console.log('\n❌ Upload API test failed');
      console.log('Error:', responseData?.error || 'Unknown error');
    }
  } catch (error) {
    console.error('\n❌ Upload API test threw an error:');
    console.error(error);
  }
}

testUploadAPI().catch(console.error);