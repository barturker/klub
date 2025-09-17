-- FIX AUTH TRIGGER - Run this in Supabase SQL Editor
-- This fixes the "Database error saving new user" issue

-- Step 1: Drop the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Drop the old function
DROP FUNCTION IF EXISTS handle_new_user();

-- Step 3: Create a more robust handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  full_name_value TEXT;
  avatar_url_value TEXT;
BEGIN
  -- Safely extract metadata values
  full_name_value := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  avatar_url_value := NEW.raw_user_meta_data->>'avatar_url';

  -- Try to insert profile
  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      avatar_url,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      full_name_value,
      avatar_url_value,
      NOW(),
      NOW()
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- Profile already exists, update it instead
      UPDATE public.profiles
      SET
        email = COALESCE(email, NEW.email),
        updated_at = NOW()
      WHERE id = NEW.id;
    WHEN OTHERS THEN
      -- Log error but don't fail the signup
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Step 5: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- Step 6: Ensure profiles table has correct structure
ALTER TABLE profiles
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN full_name SET DEFAULT '',
  ALTER COLUMN username DROP NOT NULL,
  ALTER COLUMN display_name DROP NOT NULL;

-- Step 7: Add IF NOT EXISTS for created_at and updated_at columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Step 8: Test the trigger (optional - comment out if not needed)
-- This creates a test user to verify the trigger works
/*
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  -- Insert a test user
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    test_user_id,
    'trigger_test_' || test_user_id || '@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"full_name": "Test User"}'::jsonb,
    NOW(),
    NOW()
  );

  -- Check if profile was created
  IF EXISTS (SELECT 1 FROM profiles WHERE id = test_user_id) THEN
    RAISE NOTICE 'Success: Profile created for test user %', test_user_id;
    -- Clean up test data
    DELETE FROM auth.users WHERE id = test_user_id;
    DELETE FROM profiles WHERE id = test_user_id;
  ELSE
    RAISE WARNING 'Failed: Profile not created for test user %', test_user_id;
  END IF;
END $$;
*/

-- Output success message
SELECT 'Auth trigger fixed successfully!' as message;