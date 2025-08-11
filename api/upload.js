const { supabase } = require('../lib/supabase');

module.exports = async function handler(request) {
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
        upsert: false
      });

    if (error) {
      console.error('Upload API: Supabase error:', error);
      throw error;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName);
    
    console.log('Upload API: Success! Stored in Supabase');

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        filename: fileName,
        path: data.path,
        storage: 'supabase'
      }),
      {
        status: 200,
        headers,
      }
    );

  } catch (error) {
    console.error('Upload API: Error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Upload failed',
        message: error.message,
      }),
      {
        status: 500,
        headers,
      }
    );
  }
}

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
