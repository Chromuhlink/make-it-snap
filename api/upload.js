const { supabase, bucketName } = require('../lib/supabase');
const { setCorsHeaders } = require('../lib/cors');

module.exports = async function handler(req, res) {
  console.log('Upload API: Function started, method:', req.method);

  // Set CORS headers with restricted origins
  res.setHeader('Content-Type', 'application/json');
  setCorsHeaders(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('Upload API: Parsing request body...');

    let body = req.body;
    if (!body) {
      // Parse raw body if not already parsed
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString();
      body = raw ? JSON.parse(raw) : {};
    }

    const { image, filename, zoraTxHash, coinAddress, chain } = body || {};

    if (!image) {
      console.error('Upload API: No image data provided');
      res.status(400).json({ error: 'No image data provided' });
      return;
    }

    // Validate image format
    if (!image.startsWith('data:image/')) {
      console.error('Upload API: Invalid image format');
      res.status(400).json({ error: 'Invalid image format. Must be a data URI.' });
      return;
    }

    // Extract and validate image type
    const matches = image.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/);
    if (!matches) {
      console.error('Upload API: Unsupported image type');
      res.status(400).json({ error: 'Unsupported image type. Only PNG, JPEG, GIF, and WebP are allowed.' });
      return;
    }
    const imageType = matches[1];

    // Check file size (max 5MB)
    const base64Length = image.replace(/^data:image\/\w+;base64,/, '').length;
    const estimatedSize = (base64Length * 3) / 4; // Approximate size in bytes
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    
    if (estimatedSize > maxSize) {
      console.error('Upload API: File too large:', estimatedSize, 'bytes');
      res.status(400).json({ 
        error: 'File too large. Maximum size is 5MB.',
        size: estimatedSize,
        maxSize: maxSize
      });
      return;
    }

    // Validate filename if provided
    if (filename) {
      const invalidChars = /[<>:"|?*\/\\]/g;
      if (invalidChars.test(filename)) {
        console.error('Upload API: Invalid filename characters');
        res.status(400).json({ error: 'Filename contains invalid characters.' });
        return;
      }
    }

    console.log('Upload API: Processing image upload');
    console.log('Upload API: Image type:', imageType, 'Size:', Math.round(estimatedSize / 1024), 'KB');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeFilename = filename ? filename.replace(/[^a-zA-Z0-9._-]/g, '_') : null;
    const fileName = safeFilename || `photo-${timestamp}.${imageType}`;

    // Convert base64 to Node Buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Double-check actual buffer size
    if (buffer.length > maxSize) {
      console.error('Upload API: Buffer too large after decoding');
      res.status(400).json({ error: 'File too large after processing.' });
      return;
    }

    console.log(`Upload API: Uploading to Supabase storage bucket '${bucketName}'...`);

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: `image/${imageType}`,
        upsert: false,
      });

    if (error) {
      console.error('Upload API: Supabase error:', error);
      throw error;
    }

    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    const publicUrl = publicData?.publicUrl;

    // Optionally upload sidecar metadata for Zora linking
    try {
      const meta = {
        zoraTxHash: zoraTxHash || null,
        coinAddress: coinAddress || null,
        chain: chain || 'base',
        // Precompute a basic explorer URL as a fallback link
        explorerUrl: zoraTxHash ? `https://basescan.org/tx/${zoraTxHash}` : null,
        zoraUrl: coinAddress ? `https://zora.co/coin/${coinAddress}` : null
      };
      const metaJson = JSON.stringify(meta, null, 2);
      const metaName = `${fileName}.json`;
      await supabase.storage
        .from(bucketName)
        .upload(metaName, Buffer.from(metaJson), {
          contentType: 'application/json',
          upsert: true
        });
    } catch (metaErr) {
      console.warn('Upload API: Failed to upload metadata (non-blocking):', metaErr?.message || metaErr);
    }

    console.log('Upload API: Success! Stored in Supabase');
    res.status(200).json({
      success: true,
      url: publicUrl,
      filename: fileName,
      path: data.path,
      storage: 'supabase',
      zoraTxHash: zoraTxHash || null,
      coinAddress: coinAddress || null,
      chain: chain || 'base'
    });
  } catch (error) {
    console.error('Upload API: Error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message,
    });
  }
};