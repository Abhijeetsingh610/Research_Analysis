-- Update storage bucket to allow public access for viewing PDFs
UPDATE storage.buckets 
SET public = true 
WHERE id = 'papers';

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own papers" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own papers" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own papers" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own papers" ON storage.objects;

-- Create new policies for public bucket
CREATE POLICY "Users can upload their own papers" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'papers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view papers" ON storage.objects
FOR SELECT USING (bucket_id = 'papers');

CREATE POLICY "Users can update their own papers" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'papers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own papers" ON storage.objects
FOR DELETE USING (
  bucket_id = 'papers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
