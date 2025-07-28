import { put } from '@vercel/blob';

export default async function handler(request) {
  // Check for required environment variables
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Blob storage not configured' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = await request.json();
    const { image, filename } = body;

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image data provided' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Remove data:image/png;base64, prefix if present
    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Generate timestamp filename if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = filename || `photo-${timestamp}.png`;

    // Upload to Vercel Blob Storage
    const blob = await put(fileName, imageBuffer, {
      access: 'public',
      contentType: 'image/png',
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: blob.url,
        filename: fileName,
        size: imageBuffer.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Upload error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Upload failed',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}