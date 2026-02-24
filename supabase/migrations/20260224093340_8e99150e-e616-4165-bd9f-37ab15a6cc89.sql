
-- Drop old restrictive student SELECT policies on quizzes and challenges
DROP POLICY IF EXISTS "Students read class quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Students read class challenges" ON public.challenges;

-- New policy: students can read published quizzes (whether class_id matches or is NULL)
CREATE POLICY "Students read published quizzes"
ON public.quizzes FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'STUDENT'::app_role) 
  AND is_published = true
  AND (
    class_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM class_students 
      WHERE class_students.class_id = quizzes.class_id 
      AND class_students.student_id = auth.uid()
    )
  )
);

-- New policy: students can read active challenges (whether class_id matches or is NULL)
CREATE POLICY "Students read active challenges"
ON public.challenges FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'STUDENT'::app_role)
  AND is_active = true
  AND (
    class_id IS NULL
    OR EXISTS (
      SELECT 1 FROM class_students
      WHERE class_students.class_id = challenges.class_id
      AND class_students.student_id = auth.uid()
    )
  )
);
