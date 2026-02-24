
-- Add is_published to quizzes for teacher to control visibility
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

-- Add attachment_url and reaction_score to challenge_submissions
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS reaction_score integer;

-- Create storage bucket for challenge attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('challenge-attachments', 'challenge-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for challenge-attachments
CREATE POLICY "Students upload challenge attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'challenge-attachments');

CREATE POLICY "Anyone can view challenge attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'challenge-attachments');

-- Allow teachers to manage quiz questions (update/delete)
CREATE POLICY "Teachers update quiz questions"
ON public.quiz_questions FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.created_by = auth.uid()
));

CREATE POLICY "Teachers delete quiz questions"
ON public.quiz_questions FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.created_by = auth.uid()
));

-- Allow teachers to delete quizzes
CREATE POLICY "Teachers delete quizzes"
ON public.quizzes FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Allow teachers to update classes (for section/level assignment)
CREATE POLICY "Teachers update own classes"
ON public.classes FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid());

-- Allow teachers to manage class_students (add/remove students)
CREATE POLICY "Teachers manage class students"
ON public.class_students FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM classes WHERE classes.id = class_students.class_id AND classes.teacher_id = auth.uid()
));

-- Allow teachers to delete challenges
CREATE POLICY "Teachers delete challenges"
ON public.challenges FOR DELETE
TO authenticated
USING (teacher_id = auth.uid());
