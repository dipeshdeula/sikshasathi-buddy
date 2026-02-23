
-- Create storage bucket for CDC uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('cdc-documents', 'cdc-documents', false);

-- RLS policy: teachers can upload CDC documents
CREATE POLICY "Teachers upload CDC docs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'cdc-documents' AND
    public.has_role(auth.uid(), 'TEACHER')
  );

-- RLS policy: teachers can read their own uploads
CREATE POLICY "Teachers read own CDC docs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'cdc-documents' AND
    public.has_role(auth.uid(), 'TEACHER')
  );

-- Add a cdc_uploads tracking table
CREATE TABLE public.cdc_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES public.profiles(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  grade_name TEXT,
  subject_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  extracted_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.cdc_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own uploads" ON public.cdc_uploads
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Admin read all uploads" ON public.cdc_uploads
  FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'));
