-- ABDUOOL DATA LINK - Supabase starter schema
-- Run each statement separately in SQL Editor (one query at a time).

-- 1. Create customer profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text DEFAULT 'Customer',
  email text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- 2. Enable row-level security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Allow each signed-in customer to read only their own profile
CREATE POLICY "Customers can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

-- 4. Allow each signed-in customer to create only their own profile
CREATE POLICY "Customers can create own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- 5. Allow each signed-in customer to update only their own profile
CREATE POLICY "Customers can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
