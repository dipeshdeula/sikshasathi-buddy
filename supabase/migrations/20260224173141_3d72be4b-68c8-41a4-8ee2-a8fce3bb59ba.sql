-- Add unique constraint for mastery upsert from QuizSolver
CREATE UNIQUE INDEX mastery_states_student_topic_unique ON public.mastery_states (student_id, topic_id);