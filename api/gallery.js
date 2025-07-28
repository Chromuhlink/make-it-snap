import { list } from '@vercel/blob';

export default async function handler(request) {
  console.log('Gallery API: Received request, method:', request.method);
  
  // Add CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };
  
  // Handle OPTIONS request for CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }
  
  // Check for required environment variables
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Gallery API: BLOB_READ_WRITE_TOKEN not configured');
    return new Response(
      JSON.stringify({ error: 'Blob storage not configured' }),
      {
        status: 500,
        headers,
      }
    );
  }

  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers,
      }
    );
  }

  try {
    console.log('Gallery API: Starting blob list request');
    
    // List all blobs from Vercel Blob Storage
    const { blobs } = await list();
    
    console.log('Gallery API: Found', blobs?.length || 0, 'total blobs');
    
    // Filter for photo files and sort by uploadedAt (newest first)
    const photos = blobs
      .filter(blob => blob.pathname.startsWith('photo-'))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .map(blob => ({
        url: blob.url,
        filename: blob.pathname,
        uploadedAt: blob.uploadedAt,
        size: blob.size,
      }));

    console.log('Gallery API: Filtered to', photos.length, 'photos');

    return new Response(
      JSON.stringify({
        success: true,
        photos,
        count: photos.length,
      }),
      {
        status: 200,
        headers,
      }
    );

  } catch (error) {
    console.error('Gallery API: Error:', error);
    console.error('Gallery API: Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch gallery',
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