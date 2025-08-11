const { supabase } = require('../lib/supabase');

module.exports = async (req, res) => {
  console.log('Gallery API: Function started');

  // Add CORS headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Gallery API: Fetching from Supabase storage');

    // List all files from Supabase storage
    const { data: files, error } = await supabase.storage
      .from('photos')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('Gallery API: Supabase error:', error);
      throw error;
    }

    // Transform files into photo objects with public URLs
    const photos = files.map((file) => {
      const {
        data: { publicUrl },
      } = supabase.storage.from('photos').getPublicUrl(file.name);

      return {
        url: publicUrl,
        filename: file.name,
        uploadedAt: file.created_at,
        size: file.metadata?.size || 0,
      };
    });

    console.log('Gallery API: Found', photos.length, 'photos in Supabase');

    return res.status(200).json({
      success: true,
      photos,
      count: photos.length,
      storage: 'supabase',
    });
  } catch (error) {
    console.error('Gallery API: Error:', error);

    return res.status(500).json({
      error: 'Failed to fetch gallery',
      message: error.message,
    });
  }
};