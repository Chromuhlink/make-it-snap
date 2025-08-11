// CORS configuration for API endpoints
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://make-it-snap.vercel.app',
  // Add your production domain here when deployed
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean);

function setCorsHeaders(req, res, methods = 'GET, POST, OPTIONS') {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    // Allow any origin in development for easier testing
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

module.exports = { setCorsHeaders };