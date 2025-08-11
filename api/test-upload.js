module.exports = async function handler(req, res) {
  console.log('Test Upload: Method:', req.method);
  console.log('Test Upload: Content-Type:', req.headers['content-type']);
  console.log('Test Upload: Headers:', JSON.stringify(req.headers, null, 2));
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('Test Upload: Body type:', typeof req.body);
    console.log('Test Upload: Body keys:', req.body ? Object.keys(req.body) : 'no body');
    
    if (req.body && req.body.image) {
      const imageData = req.body.image;
      console.log('Test Upload: Image data type:', typeof imageData);
      console.log('Test Upload: Image data length:', imageData.length);
      console.log('Test Upload: Image data starts with:', imageData.substring(0, 50));
      
      res.status(200).json({
        success: true,
        message: 'Upload test successful',
        imageLength: imageData.length,
        imageStart: imageData.substring(0, 50)
      });
    } else {
      res.status(400).json({
        error: 'No image data found',
        bodyType: typeof req.body,
        bodyKeys: req.body ? Object.keys(req.body) : null
      });
    }
  } catch (error) {
    console.error('Test Upload: Error:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
};