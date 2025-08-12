import { supabase, bucketName } from '../lib/supabase.js';
import { setCorsHeaders } from '../lib/cors.js';

export default async function handler(req, res) {
  console.log('Gallery API: Function started');

  // Set CORS headers with restricted origins
  res.setHeader('Content-Type', 'application/json');
  setCorsHeaders(req, res, 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log(`Gallery API: Fetching from Supabase storage bucket '${bucketName}'`);

    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('Gallery API: Supabase error:', error);
      throw error;
    }

    const photos = (files || []).map((file) => {
      const { data: publicData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(file.name);

      return {
        url: publicData?.publicUrl,
        filename: file.name,
        uploadedAt: file.created_at,
        size: file.metadata?.size || 0,
      };
    });

    console.log('Gallery API: Found', photos.length, 'photos in Supabase');
    res.status(200).json({
      success: true,
      photos,
      count: photos.length,
      storage: 'supabase',
    });
  } catch (error) {
    console.error('Gallery API: Error:', error);
    res.status(500).json({
      error: 'Failed to fetch gallery',
      message: error.message,
    });
  }
}
