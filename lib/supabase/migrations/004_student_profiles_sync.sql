-- ==============================================================================
-- Migration: 004_student_profiles_sync.sql
-- Description: Upgrade friend's database to match current Origin Point codebase
-- Safe to run multiple times (idempotent, does not overwrite existing data).
-- ==============================================================================

-- 1. Ensure public.profiles table exists and has all required columns
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT CHECK (role IN ('student', 'industry', 'academician', 'institution')),
  avatar_url TEXT,
  headline TEXT,
  location TEXT,
  bio TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Upgrade existing public.profiles (adds missing columns if friend only had basic columns)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Ensure public.student_profiles table exists and has all academic & assessment columns
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  headline TEXT,
  bio TEXT,
  location TEXT,
  institution TEXT,
  department TEXT,
  academic_year TEXT,
  self_reported_skills TEXT[] DEFAULT '{}',
  career_goals TEXT,
  interests TEXT[] DEFAULT '{}',
  experience_level TEXT,
  latest_assessment JSONB,
  assessment_scores JSONB DEFAULT '{}',
  overall_skill_score INTEGER DEFAULT 0,
  verified_skills TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Upgrade existing public.student_profiles (adds missing columns if already partially created)
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS institution TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS academic_year TEXT,
  ADD COLUMN IF NOT EXISTS self_reported_skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS career_goals TEXT,
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience_level TEXT,
  ADD COLUMN IF NOT EXISTS latest_assessment JSONB,
  ADD COLUMN IF NOT EXISTS assessment_scores JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS overall_skill_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Backfill any existing student accounts from profiles into student_profiles
INSERT INTO public.student_profiles (id)
SELECT id FROM public.profiles
WHERE role = 'student'
ON CONFLICT (id) DO NOTHING;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- 5. High-Performance RLS Policies for profiles (caching auth.uid() inside SELECT)
DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

-- 6. High-Performance RLS Policies for student_profiles
DROP POLICY IF EXISTS "Students can view and update their own onboarding data" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can view their own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can update their own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can insert their own profile" ON public.student_profiles;

CREATE POLICY "Students can view their own profile"
  ON public.student_profiles FOR SELECT
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Students can update their own profile"
  ON public.student_profiles FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Students can insert their own profile"
  ON public.student_profiles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

-- 7. Automatic Auth Trigger: Initialize profile & student_profile on new auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  full_name_val TEXT;
BEGIN
  assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, email, full_name, role, avatar_url, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    full_name_val,
    assigned_role,
    NEW.raw_user_meta_data->>'avatar_url',
    FALSE
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      updated_at = NOW();

  IF assigned_role = 'student' THEN
    INSERT INTO public.student_profiles (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
