const { supabase } = require('../lib/supabase');

module.exports = async (req, res) => {
  console.log('Upload API: Function started, method:', req.method);

  // Add CORS headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Upload API: Parsing request body...');
    const { image, filename } = req.body;

    if (!image) {
      console.error('Upload API: No image data provided');
      return res.status(400).json({ error: 'No image data provided' });
    }

    console.log('Upload API: Processing image upload');

    // Generate timestamp filename if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = filename || `photo-${timestamp}.png`;

    // Convert base64 to buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    console.log('Upload API: Uploading to Supabase storage...');

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (error) {
      console.error('Upload API: Supabase error:', error);
      throw error;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('photos').getPublicUrl(fileName);

    console.log('Upload API: Success! Stored in Supabase');

    return res.status(200).json({
      success: true,
      url: publicUrl,
      filename: fileName,
      path: data.path,
      storage: 'supabase',
    });
  } catch (error) {
    console.error('Upload API: Error:', error);

    return res.status(500).json({
      error: 'Upload failed',
      message: error.message,
    });
  }
};

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};