-- Supabase Storage Setup Script for Make It Snap
-- Run this in your Supabase SQL Editor (SQL Editor tab in dashboard)

-- Step 1: Create the storage bucket (if it doesn't exist)
-- Note: This needs to be done via dashboard UI, but here's the policy setup

-- Step 2: Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policy for anonymous uploads (INSERT)
CREATE POLICY "Allow anonymous uploads" 
ON storage.objects 
FOR INSERT 
TO anon 
WITH CHECK (bucket_id = 'photos');

-- Step 4: Create policy for anonymous viewing (SELECT)  
CREATE POLICY "Allow anonymous viewing"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'photos');

-- Step 5: Create policy for anonymous deletions (optional, for cleanup)
CREATE POLICY "Allow anonymous deletions"
ON storage.objects
FOR DELETE
TO anon
USING (bucket_id = 'photos');

-- Verify policies are created
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- Important Notes:
-- 1. You must first create the 'photos' bucket via the Supabase dashboard
-- 2. Make sure the bucket is set to PUBLIC when creating it
-- 3. After running this SQL, test with: node test-supabase.js