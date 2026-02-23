-- ==========================================
-- SikshaSathi Database Schema for Supabase
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Role enum + user_roles table (security best practice: roles separate from profiles)
create type public.app_role as enum ('ADMIN', 'TEACHER', 'STUDENT', 'PARENT');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

-- 2. Security definer function to check roles (avoids RLS recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create or replace function public.get_user_role(_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.user_roles
  where user_id = _user_id
  limit 1
$$;

-- 3. Auto-create profile + default role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  
  insert into public.user_roles (user_id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::app_role, 'STUDENT'));
  
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Core tables
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade int not null,
  teacher_id uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table public.class_students (
  class_id uuid references public.classes(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  primary key (class_id, student_id)
);

create table public.parent_links (
  parent_id uuid references public.profiles(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  primary key (parent_id, student_id)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.subjects(id),
  grade int not null,
  name text not null,
  cdc_tag text
);

create table public.lesson_plans (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id),
  topic_id uuid references public.topics(id),
  level text not null,
  duration_minutes int not null,
  objectives text,
  script text,
  boardwork text,
  homework text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id),
  topic_id uuid references public.topics(id),
  title text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete cascade,
  qtype text not null,
  difficulty text not null,
  prompt text not null,
  options_json jsonb,
  answer_key text,
  explanation text
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete cascade,
  student_id uuid references public.profiles(id),
  submitted_at timestamptz default now(),
  score numeric,
  answers_json jsonb
);

create table public.mastery_states (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id),
  topic_id uuid references public.topics(id),
  mastery_score numeric not null default 0,
  updated_at timestamptz default now()
);

create table public.student_checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id),
  class_id uuid references public.classes(id),
  date date not null default current_date,
  happiness_score int not null,
  comment text
);

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id),
  student_id uuid references public.profiles(id),
  week_start date not null,
  report_text text,
  interventions_text text,
  status text not null default 'draft',
  approved_by uuid references public.profiles(id),
  sent_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  type text,
  message text,
  created_at timestamptz default now(),
  read_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  created_at timestamptz default now(),
  metadata_json jsonb
);

-- 5. Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.classes enable row level security;
alter table public.class_students enable row level security;
alter table public.parent_links enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.lesson_plans enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.mastery_states enable row level security;
alter table public.student_checkins enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- 6. RLS Policies

-- Profiles: users read own, admins read all
create policy "Users can read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "Admins can read all profiles" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(), 'ADMIN'));
create policy "Users can update own profile" on public.profiles
  for update to authenticated using (id = auth.uid());
create policy "Service can insert profiles" on public.profiles
  for insert with check (true);

-- User roles: read own, admins read all
create policy "Users can read own role" on public.user_roles
  for select to authenticated using (user_id = auth.uid());
create policy "Admins can read all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'ADMIN'));
create policy "Admins can manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(), 'ADMIN'));
create policy "Service can insert roles" on public.user_roles
  for insert with check (true);

-- Subjects & Topics: public read for authenticated
create policy "Authenticated can read subjects" on public.subjects
  for select to authenticated using (true);
create policy "Admins can manage subjects" on public.subjects
  for all to authenticated using (public.has_role(auth.uid(), 'ADMIN'));

create policy "Authenticated can read topics" on public.topics
  for select to authenticated using (true);
create policy "Admins can manage topics" on public.topics
  for all to authenticated using (public.has_role(auth.uid(), 'ADMIN'));

-- Classes: teachers see their own, admins see all
create policy "Teachers can read own classes" on public.classes
  for select to authenticated using (teacher_id = auth.uid());
create policy "Admins can manage classes" on public.classes
  for all to authenticated using (public.has_role(auth.uid(), 'ADMIN'));
create policy "Students can read their classes" on public.classes
  for select to authenticated using (
    exists (select 1 from public.class_students where class_id = id and student_id = auth.uid())
  );

-- Class students
create policy "Teachers can read class students" on public.class_students
  for select to authenticated using (
    exists (select 1 from public.classes where id = class_id and teacher_id = auth.uid())
  );
create policy "Students can read own enrollment" on public.class_students
  for select to authenticated using (student_id = auth.uid());
create policy "Admins can manage class students" on public.class_students
  for all to authenticated using (public.has_role(auth.uid(), 'ADMIN'));

-- Parent links
create policy "Parents can read own links" on public.parent_links
  for select to authenticated using (parent_id = auth.uid());
create policy "Admins can manage parent links" on public.parent_links
  for all to authenticated using (public.has_role(auth.uid(), 'ADMIN'));

-- Lesson plans: teachers CRUD their own
create policy "Teachers can manage own lesson plans" on public.lesson_plans
  for all to authenticated using (created_by = auth.uid());
create policy "Admins can read all lesson plans" on public.lesson_plans
  for select to authenticated using (public.has_role(auth.uid(), 'ADMIN'));

-- Quizzes: teachers CRUD, students read their class quizzes
create policy "Teachers can manage own quizzes" on public.quizzes
  for all to authenticated using (created_by = auth.uid());
create policy "Students can read class quizzes" on public.quizzes
  for select to authenticated using (
    exists (select 1 from public.class_students where class_id = quizzes.class_id and student_id = auth.uid())
  );

-- Quiz questions: follow quiz access
create policy "Authenticated can read quiz questions" on public.quiz_questions
  for select to authenticated using (true);
create policy "Teachers can manage quiz questions" on public.quiz_questions
  for insert to authenticated with check (
    exists (select 1 from public.quizzes where id = quiz_id and created_by = auth.uid())
  );

-- Quiz attempts: students own, teachers see class
create policy "Students can manage own attempts" on public.quiz_attempts
  for all to authenticated using (student_id = auth.uid());
create policy "Teachers can read class attempts" on public.quiz_attempts
  for select to authenticated using (
    exists (
      select 1 from public.quizzes q
      join public.classes c on c.id = q.class_id
      where q.id = quiz_id and c.teacher_id = auth.uid()
    )
  );
create policy "Teachers can insert attempts for students" on public.quiz_attempts
  for insert to authenticated with check (
    exists (
      select 1 from public.quizzes q
      join public.classes c on c.id = q.class_id
      where q.id = quiz_id and c.teacher_id = auth.uid()
    )
  );

-- Mastery states
create policy "Students can read own mastery" on public.mastery_states
  for select to authenticated using (student_id = auth.uid());
create policy "Teachers can manage class mastery" on public.mastery_states
  for all to authenticated using (
    exists (
      select 1 from public.class_students cs
      join public.classes c on c.id = cs.class_id
      where cs.student_id = mastery_states.student_id and c.teacher_id = auth.uid()
    )
  );
create policy "Parents can read child mastery" on public.mastery_states
  for select to authenticated using (
    exists (select 1 from public.parent_links where parent_id = auth.uid() and student_id = mastery_states.student_id)
  );

-- Student checkins
create policy "Students can manage own checkins" on public.student_checkins
  for all to authenticated using (student_id = auth.uid());
create policy "Teachers can read class checkins" on public.student_checkins
  for select to authenticated using (
    exists (select 1 from public.classes where id = class_id and teacher_id = auth.uid())
  );

-- Weekly reports
create policy "Teachers can manage reports" on public.weekly_reports
  for all to authenticated using (
    exists (select 1 from public.classes where id = class_id and teacher_id = auth.uid())
  );
create policy "Parents can read approved reports" on public.weekly_reports
  for select to authenticated using (
    exists (select 1 from public.parent_links where parent_id = auth.uid() and student_id = weekly_reports.student_id)
    and status in ('approved', 'sent')
  );

-- Notifications
create policy "Users can read own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "Users can update own notifications" on public.notifications
  for update to authenticated using (user_id = auth.uid());
create policy "Authenticated can insert notifications" on public.notifications
  for insert to authenticated with check (true);

-- Audit logs
create policy "Admins can read audit logs" on public.audit_logs
  for select to authenticated using (public.has_role(auth.uid(), 'ADMIN'));
create policy "Authenticated can insert audit logs" on public.audit_logs
  for insert to authenticated with check (true);

-- 7. Seed data: subjects and topics
insert into public.subjects (id, name) values
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Math'),
  ('a1b2c3d4-0001-4000-8000-000000000002', 'Science'),
  ('a1b2c3d4-0001-4000-8000-000000000003', 'Nepali');

insert into public.topics (id, subject_id, grade, name, cdc_tag) values
  ('b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 7, 'Fractions', 'CDC-MATH-7-01'),
  ('b1b2c3d4-0001-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', 7, 'Decimals', 'CDC-MATH-7-02'),
  ('b1b2c3d4-0001-4000-8000-000000000003', 'a1b2c3d4-0001-4000-8000-000000000001', 7, 'Basic Algebra', 'CDC-MATH-7-03'),
  ('b1b2c3d4-0001-4000-8000-000000000004', 'a1b2c3d4-0001-4000-8000-000000000002', 7, 'Exothermic Reactions', 'CDC-SCI-7-01'),
  ('b1b2c3d4-0001-4000-8000-000000000005', 'a1b2c3d4-0001-4000-8000-000000000002', 7, 'Photosynthesis', 'CDC-SCI-7-02'),
  ('b1b2c3d4-0001-4000-8000-000000000006', 'a1b2c3d4-0001-4000-8000-000000000002', 7, 'Plant & Animal Cells', 'CDC-SCI-7-03'),
  ('b1b2c3d4-0001-4000-8000-000000000007', 'a1b2c3d4-0001-4000-8000-000000000003', 7, 'हाम्रो नेपाल (Our Nepal)', 'CDC-NEP-7-01'),
  ('b1b2c3d4-0001-4000-8000-000000000008', 'a1b2c3d4-0001-4000-8000-000000000003', 7, 'कथा लेखन (Story Writing)', 'CDC-NEP-7-02');
