export default async function handler(request) {
  console.log('Test API: Function started');

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Test API is working!',
      timestamp: new Date().toISOString(),
      hasBlob: !!process.env.BLOB_READ_WRITE_TOKEN,
      method: request.method,
    }),
    {
      status: 200,
      headers,
    }
  );
}

