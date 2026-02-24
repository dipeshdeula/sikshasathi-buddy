
-- Challenges table (freeform challenges by teachers)
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  due_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Challenge submissions by students
CREATE TABLE public.challenge_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  review_text TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(challenge_id, student_id)
);

-- Student badges/rewards
CREATE TABLE public.student_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL DEFAULT 'challenge',
  source_id UUID,
  awarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Teacher presentations/videos from teaching scripts
CREATE TABLE public.teacher_presentations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  guideline_id UUID REFERENCES public.teacher_guidelines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slides_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_presentations ENABLE ROW LEVEL SECURITY;

-- Challenges policies
CREATE POLICY "Teachers manage own challenges" ON public.challenges FOR ALL USING (teacher_id = auth.uid());
CREATE POLICY "Students read class challenges" ON public.challenges FOR SELECT USING (
  EXISTS (SELECT 1 FROM class_students WHERE class_students.class_id = challenges.class_id AND class_students.student_id = auth.uid())
);

-- Challenge submissions policies
CREATE POLICY "Students manage own submissions" ON public.challenge_submissions FOR ALL USING (student_id = auth.uid());
CREATE POLICY "Teachers read class submissions" ON public.challenge_submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM challenges WHERE challenges.id = challenge_submissions.challenge_id AND challenges.teacher_id = auth.uid())
);
CREATE POLICY "Teachers update submissions" ON public.challenge_submissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM challenges WHERE challenges.id = challenge_submissions.challenge_id AND challenges.teacher_id = auth.uid())
);

-- Student badges policies
CREATE POLICY "Students read own badges" ON public.student_badges FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Teachers manage badges" ON public.student_badges FOR ALL USING (
  has_role(auth.uid(), 'TEACHER'::app_role)
);

-- Presentations policies
CREATE POLICY "Teachers manage own presentations" ON public.teacher_presentations FOR ALL USING (teacher_id = auth.uid());
CREATE POLICY "Students read published presentations" ON public.teacher_presentations FOR SELECT USING (is_published = true);
