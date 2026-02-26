
-- Drop the overly permissive teacher profile read policy
DROP POLICY IF EXISTS "Teachers read profiles" ON public.profiles;

-- Create a scoped policy: teachers can only read profiles of students in their classes
CREATE POLICY "Teachers read class student profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.student_id = profiles.id
        AND c.teacher_id = auth.uid()
    )
  );
