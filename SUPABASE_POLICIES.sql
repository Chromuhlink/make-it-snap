-- Supabase Storage Policies for Photo Gallery App
-- Run these in your Supabase SQL Editor if you prefer setting up policies via SQL

-- Policy 1: Allow anonymous users to upload photos (INSERT)
CREATE POLICY "Allow anonymous uploads" ON storage.objects
FOR INSERT 
TO anon 
WITH CHECK (bucket_id = 'photos');

-- Policy 2: Allow anonymous users to view photos (SELECT)
CREATE POLICY "Allow anonymous viewing" ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'photos');

-- Optional: Allow anonymous users to delete photos (DELETE)
-- Uncomment if you want to allow deletion
-- CREATE POLICY "Allow anonymous deletion" ON storage.objects
-- FOR DELETE
-- TO anon
-- USING (bucket_id = 'photos');

-- Verify policies are created
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';