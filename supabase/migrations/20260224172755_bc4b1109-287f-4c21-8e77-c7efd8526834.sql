-- Teachers can read quiz_attempts for students enrolled in their classes
CREATE POLICY "Teachers read attempts by class students"
ON public.quiz_attempts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM class_students cs
    JOIN classes c ON c.id = cs.class_id
    WHERE cs.student_id = quiz_attempts.student_id
    AND c.teacher_id = auth.uid()
  )
);

-- Teachers can read challenge_submissions for students enrolled in their classes
CREATE POLICY "Teachers read submissions by class students"
ON public.challenge_submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM class_students cs
    JOIN classes c ON c.id = cs.class_id
    WHERE cs.student_id = challenge_submissions.student_id
    AND c.teacher_id = auth.uid()
  )
);