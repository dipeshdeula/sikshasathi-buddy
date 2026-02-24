
-- Add verification and preference fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_class_level text,
  ADD COLUMN IF NOT EXISTS preferred_section text;
