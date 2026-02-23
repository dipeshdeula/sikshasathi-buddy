
-- Role enum + user_roles
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'TEACHER', 'STUDENT', 'PARENT');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role::text FROM public.user_roles WHERE user_id = _user_id LIMIT 1 $$;

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, coalesce((new.raw_user_meta_data->>'role')::app_role, 'STUDENT'));
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 1. Normalized Curriculum: Grades
CREATE TABLE public.grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  level text NOT NULL DEFAULT 'Basic',
  academic_year text DEFAULT '2081',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Subjects (linked to grade)
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid REFERENCES public.grades(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  total_hours_per_year int,
  is_compulsory boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. Units
CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index int DEFAULT 0,
  estimated_hours numeric,
  created_at timestamptz DEFAULT now()
);

-- 4. Topics (linked to unit)
CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index int DEFAULT 0,
  estimated_minutes int,
  difficulty_level text DEFAULT 'Medium',
  created_at timestamptz DEFAULT now()
);

-- 5. Learning Outcomes
CREATE TABLE public.learning_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  outcome_text text NOT NULL,
  competency_level text,
  bloom_level text,
  created_at timestamptz DEFAULT now()
);

-- 6. Teaching Guidelines
CREATE TABLE public.teaching_guidelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  guideline_text text NOT NULL,
  method_type text,
  created_at timestamptz DEFAULT now()
);

-- 7. Assessment Indicators
CREATE TABLE public.assessment_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  indicator_text text NOT NULL,
  assessment_type text,
  created_at timestamptz DEFAULT now()
);

-- 8. Teacher-Subject assignments
CREATE TABLE public.teacher_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  UNIQUE(teacher_id, subject_id)
);

-- 9. Classes
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  grade_id uuid REFERENCES public.grades(id),
  teacher_id uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.class_students (
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, student_id)
);

CREATE TABLE public.parent_links (
  parent_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, student_id)
);

-- 10. Lesson Plans (updated: references topic, teacher directly)
CREATE TABLE public.lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES public.profiles(id),
  topic_id uuid REFERENCES public.topics(id),
  duration_type text NOT NULL DEFAULT 'Daily',
  class_level text NOT NULL DEFAULT 'Medium',
  objectives text,
  homework text,
  generated_by_ai boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 11. Teacher Guidelines (teaching script, boardwork, references, presentation)
CREATE TABLE public.teacher_guidelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES public.profiles(id),
  topic_id uuid REFERENCES public.topics(id),
  teaching_script text,
  boardwork text,
  reference_links text,
  presentation_content text,
  generated_by_ai boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 12. Quizzes
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes(id),
  topic_id uuid REFERENCES public.topics(id),
  title text NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
  qtype text NOT NULL,
  difficulty text NOT NULL,
  prompt text NOT NULL,
  options_json jsonb,
  answer_key text,
  explanation text
);

CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.profiles(id),
  submitted_at timestamptz DEFAULT now(),
  score numeric,
  answers_json jsonb
);

-- 13. Mastery, Checkins, Reports, Notifications, Audit
CREATE TABLE public.mastery_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.profiles(id),
  topic_id uuid REFERENCES public.topics(id),
  mastery_score numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.student_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.profiles(id),
  class_id uuid REFERENCES public.classes(id),
  date date NOT NULL DEFAULT current_date,
  happiness_score int NOT NULL,
  comment text
);

CREATE TABLE public.weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes(id),
  student_id uuid REFERENCES public.profiles(id),
  week_start date NOT NULL,
  report_text text,
  interventions_text text,
  status text NOT NULL DEFAULT 'draft',
  approved_by uuid REFERENCES public.profiles(id),
  sent_at timestamptz
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  type text,
  message text,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  created_at timestamptz DEFAULT now(),
  metadata_json jsonb
);
