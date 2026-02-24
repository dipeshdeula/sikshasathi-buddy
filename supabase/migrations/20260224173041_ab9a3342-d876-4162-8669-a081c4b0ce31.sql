-- Students need to be able to upsert their own mastery after quiz completion
CREATE POLICY "Students manage own mastery"
ON public.mastery_states FOR ALL
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());