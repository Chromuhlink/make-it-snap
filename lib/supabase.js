const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_BUCKET || 'photos';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables:');
  console.error('SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_ANON_KEY:', !!supabaseAnonKey);
  throw new Error('Missing Supabase environment variables. Check your .env.local file.');
}

// Create client with anon key for general operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create service role client for admin operations (if available)
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

module.exports = { 
  supabase, 
  supabaseAdmin, 
  bucketName 
};