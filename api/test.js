module.exports = async function handler(req, res) {
  console.log('Test API: Function started');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    success: true,
    message: 'Test API is working!',
    timestamp: new Date().toISOString(),
    hasBlob: !!process.env.BLOB_READ_WRITE_TOKEN,
    method: req.method,
  });
};