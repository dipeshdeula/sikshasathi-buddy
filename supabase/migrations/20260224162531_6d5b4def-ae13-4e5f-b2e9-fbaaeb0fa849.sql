
CREATE TABLE public.class_subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  UNIQUE(class_id, subject_id)
);

ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage class subjects" ON public.class_subjects FOR ALL USING (has_role(auth.uid(), 'ADMIN'::app_role));
CREATE POLICY "Teachers read own class subjects" ON public.class_subjects FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.classes WHERE classes.id = class_subjects.class_id AND classes.teacher_id = auth.uid())
);
CREATE POLICY "Students read own class subjects" ON public.class_subjects FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.class_students WHERE class_students.class_id = class_subjects.class_id AND class_students.student_id = auth.uid())
);
