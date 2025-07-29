export default async function handler(request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    console.log('Debug: Starting...');
    
    // Check environment
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    const tokenPrefix = process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 20) + '...';
    
    console.log('Debug: Has token:', hasToken);
    console.log('Debug: Token prefix:', tokenPrefix);
    
    // Try to import blob
    console.log('Debug: Importing @vercel/blob...');
    const { list } = await import('@vercel/blob');
    console.log('Debug: Import successful');
    
    // Try to call list
    console.log('Debug: Calling list()...');
    const result = await list();
    console.log('Debug: List result:', result);
    
    return new Response(
      JSON.stringify({
        success: true,
        hasToken,
        tokenPrefix,
        blobCount: result.blobs?.length || 0,
        result
      }),
      { status: 200, headers }
    );
    
  } catch (error) {
    console.error('Debug: Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        hasToken: !!process.env.BLOB_READ_WRITE_TOKEN
      }),
      { status: 500, headers }
    );
  }
}