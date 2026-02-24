
-- Create a security definer function to check if a user is a teacher of a class
-- This avoids infinite recursion between class_students and classes RLS policies
CREATE OR REPLACE FUNCTION public.is_teacher_of_class(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = _class_id AND teacher_id = _user_id
  );
$$;

-- Drop the recursive policies on class_students
DROP POLICY IF EXISTS "Teachers manage class students" ON public.class_students;
DROP POLICY IF EXISTS "Teachers read class students" ON public.class_students;

-- Recreate using the security definer function
CREATE POLICY "Teachers manage class students"
ON public.class_students FOR ALL
USING (is_teacher_of_class(auth.uid(), class_id));

CREATE POLICY "Teachers read class students"
ON public.class_students FOR SELECT
USING (is_teacher_of_class(auth.uid(), class_id));
