
-- Self-learning paths table
CREATE TABLE public.self_learning_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  subject_area TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  roadmap_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Self-learning modules within a path
CREATE TABLE public.self_learning_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path_id UUID NOT NULL REFERENCES public.self_learning_paths(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  examples_json JSONB,
  references_json JSONB,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.self_learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_learning_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own learning paths"
  ON public.self_learning_paths FOR ALL
  USING (student_id = auth.uid());

CREATE POLICY "Students read own modules"
  ON public.self_learning_modules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.self_learning_paths
    WHERE self_learning_paths.id = self_learning_modules.path_id
    AND self_learning_paths.student_id = auth.uid()
  ));

CREATE POLICY "Students insert own modules"
  ON public.self_learning_modules FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.self_learning_paths
    WHERE self_learning_paths.id = self_learning_modules.path_id
    AND self_learning_paths.student_id = auth.uid()
  ));

CREATE POLICY "Students update own modules"
  ON public.self_learning_modules FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.self_learning_paths
    WHERE self_learning_paths.id = self_learning_modules.path_id
    AND self_learning_paths.student_id = auth.uid()
  ));

CREATE POLICY "Students delete own modules"
  ON public.self_learning_modules FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.self_learning_paths
    WHERE self_learning_paths.id = self_learning_modules.path_id
    AND self_learning_paths.student_id = auth.uid()
  ));
