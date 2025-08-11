const { supabase } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('Debug: Starting Supabase connection test...');

    // Check environment variables
    const hasUrl = !!process.env.SUPABASE_URL;
    const hasKey = !!process.env.SUPABASE_ANON_KEY;
    const urlPrefix = process.env.SUPABASE_URL
      ? process.env.SUPABASE_URL.substring(0, 30) + '...'
      : undefined;
    const keyPrefix = process.env.SUPABASE_ANON_KEY
      ? process.env.SUPABASE_ANON_KEY.substring(0, 20) + '...'
      : undefined;

    console.log('Debug: Has URL:', hasUrl);
    console.log('Debug: Has Key:', hasKey);
    console.log('Debug: URL prefix:', urlPrefix);
    console.log('Debug: Key prefix:', keyPrefix);

    // Test Supabase connection by listing files in photos bucket
    const { data: listData, error: listError } = await supabase.storage
      .from('photos')
      .list('', { limit: 5 });

    if (listError) {
      throw listError;
    }

    // Test bucket info
    const { data: bucketData, error: bucketError } = await supabase.storage
      .listBuckets();

    console.log('Debug: Supabase connection successful');

    res.status(200).json({
      success: true,
      hasUrl,
      hasKey,
      urlPrefix,
      keyPrefix,
      photoCount: listData?.length || 0,
      photos: listData || [],
      buckets: bucketData || [],
      bucketError: bucketError?.message
    });
  } catch (error) {
    console.error('Debug: Supabase Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      hasUrl: !!process.env.SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_ANON_KEY,
    });
  }
};