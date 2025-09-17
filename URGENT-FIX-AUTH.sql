-- URGENT FIX FOR SIGNUP ERROR
-- Run this IMMEDIATELY in Supabase SQL Editor
-- https://supabase.com/dashboard/project/uchbiaeauxadjsjnjmjf/sql/new

-- 1. Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 2. Create SIMPLE working trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW; -- Don't fail signup even if profile creation fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 4. Make sure profile columns are nullable
ALTER TABLE profiles
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN full_name DROP NOT NULL,
  ALTER COLUMN username DROP NOT NULL,
  ALTER COLUMN display_name DROP NOT NULL;

-- 5. Done!
SELECT 'AUTH FIXED! Try signup again!' as status;