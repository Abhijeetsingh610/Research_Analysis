-- Update storage bucket to be public for viewing PDFs
UPDATE storage.buckets 
SET public = true 
WHERE id = 'papers';

-- Add policy for public read access to papers
CREATE POLICY "Public read access for papers" ON storage.objects
FOR SELECT USING (bucket_id = 'papers');

-- Ensure authenticated users can upload to their own folder
CREATE POLICY "Users can upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'papers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Ensure users can delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'papers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
