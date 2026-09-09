-- Add a gate flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Student-specific onboarding data (self-reported, separate from assessment-derived skill_profiles)
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  bio TEXT,
  interests TEXT[] DEFAULT '{}',
  self_reported_skills TEXT[] DEFAULT '{}',
  career_goals TEXT,
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view and update their own onboarding data"
  ON public.student_profiles FOR ALL
  USING (auth.uid() = id);