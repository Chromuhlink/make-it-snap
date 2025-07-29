import { put } from '@vercel/blob';

export default async function handler(request) {
  console.log('Upload API: Function started, method:', request.method);
  
  // Add CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  // Handle OPTIONS request for CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }
  
  // Check for required environment variables
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Upload API: BLOB_READ_WRITE_TOKEN not configured');
    return new Response(
      JSON.stringify({ 
        error: 'Blob storage not configured',
        hasToken: false 
      }),
      {
        status: 500,
        headers,
      }
    );
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers,
      }
    );
  }

  try {
    console.log('Upload API: Parsing request body...');
    const body = await request.json();
    const { image, filename } = body;

    if (!image) {
      console.error('Upload API: No image data provided');
      return new Response(
        JSON.stringify({ error: 'No image data provided' }),
        {
          status: 400,
          headers,
        }
      );
    }

    console.log('Upload API: Processing image upload');
    
    // Remove data:image/png;base64, prefix if present
    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    console.log('Upload API: Image buffer size:', imageBuffer.length);
    
    // Generate timestamp filename if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = filename || `photo-${timestamp}.png`;
    
    console.log('Upload API: Uploading as:', fileName);

    // Upload to Vercel Blob Storage
    const blob = await put(fileName, imageBuffer, {
      access: 'public',
      contentType: 'image/png',
    });
    
    console.log('Upload API: Success! Blob URL:', blob.url);

    return new Response(
      JSON.stringify({
        success: true,
        url: blob.url,
        filename: fileName,
        size: imageBuffer.length,
      }),
      {
        status: 200,
        headers,
      }
    );

  } catch (error) {
    console.error('Upload API: Error:', error);
    console.error('Upload API: Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({
        error: 'Upload failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }),
      {
        status: 500,
        headers,
      }
    );
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};