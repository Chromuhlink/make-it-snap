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
    console.log('Debug: Starting...');

    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    const tokenPrefix = process.env.BLOB_READ_WRITE_TOKEN
      ? process.env.BLOB_READ_WRITE_TOKEN.substring(0, 20) + '...'
      : undefined;

    console.log('Debug: Has token:', hasToken);
    console.log('Debug: Token prefix:', tokenPrefix);

    const { list } = await import('@vercel/blob');
    const result = await list();

    res.status(200).json({
      success: true,
      hasToken,
      tokenPrefix,
      blobCount: result.blobs?.length || 0,
      result,
    });
  } catch (error) {
    console.error('Debug: Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    });
  }
};