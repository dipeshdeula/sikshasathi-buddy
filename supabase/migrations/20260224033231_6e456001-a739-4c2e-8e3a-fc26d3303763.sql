
-- Table to track lesson plan completion by teachers and student verification
CREATE TABLE public.lesson_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_plan_id UUID NOT NULL REFERENCES public.lesson_plans(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.student_lesson_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_plan_id UUID NOT NULL REFERENCES public.lesson_plans(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lesson_plan_id, student_id)
);

-- Enable RLS
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lesson_verifications ENABLE ROW LEVEL SECURITY;

-- RLS for lesson_completions
CREATE POLICY "Teachers manage own completions" ON public.lesson_completions
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Admin manage completions" ON public.lesson_completions
  FOR ALL USING (has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Students read lesson completions" ON public.lesson_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_plans lp
      JOIN classes c ON c.teacher_id = lp.teacher_id
      JOIN class_students cs ON cs.class_id = c.id
      WHERE lp.id = lesson_completions.lesson_plan_id
      AND cs.student_id = auth.uid()
    )
  );

-- RLS for student_lesson_verifications
CREATE POLICY "Students manage own verifications" ON public.student_lesson_verifications
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers read class verifications" ON public.student_lesson_verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_plans lp
      JOIN classes c ON c.teacher_id = lp.teacher_id
      WHERE lp.id = student_lesson_verifications.lesson_plan_id
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admin manage verifications" ON public.student_lesson_verifications
  FOR ALL USING (has_role(auth.uid(), 'ADMIN'::app_role));
