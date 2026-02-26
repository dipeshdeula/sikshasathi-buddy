
-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Students read published presentations" ON public.teacher_presentations;

-- Restrict to authenticated users only
CREATE POLICY "Students read published presentations" ON public.teacher_presentations
  FOR SELECT TO authenticated
  USING (is_published = true);
