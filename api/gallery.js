const { supabase } = require('../lib/supabase');

export default async function handler(request) {
  console.log('Gallery API: Function started');
  
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
    console.log('Gallery API: Fetching from Supabase storage');
    
    // List all files from Supabase storage
    const { data: files, error } = await supabase.storage
      .from('photos')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Gallery API: Supabase error:', error);
      throw error;
    }

    // Transform files into photo objects with public URLs
    const photos = files.map(file => {
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(file.name);
      
      return {
        url: publicUrl,
        filename: file.name,
        uploadedAt: file.created_at,
        size: file.metadata?.size || 0,
      };
    });

    console.log('Gallery API: Found', photos.length, 'photos in Supabase');

    return new Response(
      JSON.stringify({
        success: true,
        photos,
        count: photos.length,
        storage: 'supabase'
      }),
      {
        status: 200,
        headers,
      }
    );

  } catch (error) {
    console.error('Gallery API: Error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch gallery',
        message: error.message,
      }),
      {
        status: 500,
        headers,
      }
    );
  }
}