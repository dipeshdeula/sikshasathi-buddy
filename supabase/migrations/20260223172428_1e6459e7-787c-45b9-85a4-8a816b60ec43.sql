
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastery_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Teachers read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'TEACHER'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);

-- User roles
CREATE POLICY "Users read own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Insert roles" ON public.user_roles FOR INSERT WITH CHECK (true);

-- Curriculum tables: read for authenticated
CREATE POLICY "Auth read grades" ON public.grades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage grades" ON public.grades FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Auth read subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Auth read units" ON public.units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage units" ON public.units FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Auth read topics" ON public.topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage topics" ON public.topics FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Auth read outcomes" ON public.learning_outcomes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage outcomes" ON public.learning_outcomes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Auth read guidelines" ON public.teaching_guidelines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage guidelines" ON public.teaching_guidelines FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Auth read indicators" ON public.assessment_indicators FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage indicators" ON public.assessment_indicators FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Teacher subjects
CREATE POLICY "Teachers read own subjects" ON public.teacher_subjects FOR SELECT TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Admin manage teacher subjects" ON public.teacher_subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Classes
CREATE POLICY "Teachers read own classes" ON public.classes FOR SELECT TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Admin manage classes" ON public.classes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Students read their classes" ON public.classes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.class_students WHERE class_id = id AND student_id = auth.uid())
);

-- Class students
CREATE POLICY "Teachers read class students" ON public.class_students FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
);
CREATE POLICY "Students read own enrollment" ON public.class_students FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Admin manage class students" ON public.class_students FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Parent links
CREATE POLICY "Parents read own links" ON public.parent_links FOR SELECT TO authenticated USING (parent_id = auth.uid());
CREATE POLICY "Admin manage parent links" ON public.parent_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Lesson plans: teacher CRUD own
CREATE POLICY "Teachers manage own lesson plans" ON public.lesson_plans FOR ALL TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Admin read lesson plans" ON public.lesson_plans FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Teacher guidelines: teacher CRUD own
CREATE POLICY "Teachers manage own guidelines" ON public.teacher_guidelines FOR ALL TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Admin read teacher guidelines" ON public.teacher_guidelines FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Quizzes
CREATE POLICY "Teachers manage own quizzes" ON public.quizzes FOR ALL TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Students read class quizzes" ON public.quizzes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.class_students WHERE class_id = quizzes.class_id AND student_id = auth.uid())
);

-- Quiz questions
CREATE POLICY "Auth read quiz questions" ON public.quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers insert quiz questions" ON public.quiz_questions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_id AND created_by = auth.uid())
);

-- Quiz attempts
CREATE POLICY "Students manage own attempts" ON public.quiz_attempts FOR ALL TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Teachers read class attempts" ON public.quiz_attempts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.classes c ON c.id = q.class_id WHERE q.id = quiz_id AND c.teacher_id = auth.uid())
);
CREATE POLICY "Teachers insert attempts" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.classes c ON c.id = q.class_id WHERE q.id = quiz_id AND c.teacher_id = auth.uid())
);

-- Mastery
CREATE POLICY "Students read own mastery" ON public.mastery_states FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Teachers manage class mastery" ON public.mastery_states FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.class_students cs JOIN public.classes c ON c.id = cs.class_id WHERE cs.student_id = mastery_states.student_id AND c.teacher_id = auth.uid())
);

-- Checkins
CREATE POLICY "Students manage own checkins" ON public.student_checkins FOR ALL TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Teachers read class checkins" ON public.student_checkins FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
);

-- Reports
CREATE POLICY "Teachers manage reports" ON public.weekly_reports FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
);
CREATE POLICY "Parents read approved reports" ON public.weekly_reports FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.parent_links WHERE parent_id = auth.uid() AND student_id = weekly_reports.student_id) AND status IN ('approved', 'sent')
);

-- Notifications
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Auth insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Audit logs
CREATE POLICY "Admin read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Auth insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
