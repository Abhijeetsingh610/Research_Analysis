-- Create a storage bucket for PDF files
INSERT INTO storage.buckets (id, name, public)
VALUES ('papers', 'papers', false);

-- Create storage policies for the papers bucket
CREATE POLICY "Users can upload their own papers" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'papers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own papers" ON storage.objects
FOR SELECT USING (
  bucket_id = 'papers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

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
