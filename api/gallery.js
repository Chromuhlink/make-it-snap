import { list } from '@vercel/blob';

export const config = {
  runtime: 'edge',
};

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

  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // List all blobs from Vercel Blob Storage
    const { blobs } = await list();
    
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

    return new Response(
      JSON.stringify({
        success: true,
        photos,
        count: photos.length,
      }),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );

  } catch (error) {
    console.error('Gallery fetch error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch gallery',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}