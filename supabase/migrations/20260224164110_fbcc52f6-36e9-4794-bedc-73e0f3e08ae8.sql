
-- Allow teachers to update profiles of students in their classes
CREATE POLICY "Teachers update class student profiles"
ON public.profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.class_students cs
    JOIN public.classes c ON c.id = cs.class_id
    WHERE cs.student_id = profiles.id AND c.teacher_id = auth.uid()
  )
);

-- Allow admins to update any profile
CREATE POLICY "Admins update all profiles"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'ADMIN'::app_role));
