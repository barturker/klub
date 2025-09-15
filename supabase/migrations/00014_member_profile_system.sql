-- Migration: Member Profile System
-- Story: STORY-006
-- Created: 2025-01-15
-- Description: Extends profiles table for complete member profile functionality

-- =============================================
-- EXTEND PROFILES TABLE
-- =============================================

DO $$
BEGIN
    -- Add display_name column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'display_name'
    ) THEN
        ALTER TABLE profiles ADD COLUMN display_name TEXT;
    END IF;

    -- Bio column already exists in current schema

    -- Avatar_url already exists in current schema

    -- Location already exists in current schema

    -- Add interests array column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'interests'
    ) THEN
        ALTER TABLE profiles ADD COLUMN interests TEXT[] DEFAULT '{}';
    END IF;

    -- Add social_links JSONB column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'social_links'
    ) THEN
        ALTER TABLE profiles ADD COLUMN social_links JSONB DEFAULT '{}';
    END IF;

    -- Add privacy_level column with CHECK constraint if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'privacy_level'
    ) THEN
        ALTER TABLE profiles ADD COLUMN privacy_level TEXT DEFAULT 'public';

        -- Add CHECK constraint for privacy_level values
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'profiles_privacy_level_check'
        ) THEN
            ALTER TABLE profiles
            ADD CONSTRAINT profiles_privacy_level_check
            CHECK (privacy_level IN ('public', 'members_only', 'private'));
        END IF;
    END IF;

    -- Add profile_complete boolean column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'profile_complete'
    ) THEN
        ALTER TABLE profiles ADD COLUMN profile_complete BOOLEAN DEFAULT false;
    END IF;

    -- Add last_active timestamp column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'last_active'
    ) THEN
        ALTER TABLE profiles ADD COLUMN last_active TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Add member_since timestamp column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'member_since'
    ) THEN
        ALTER TABLE profiles ADD COLUMN member_since TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Add metadata JSONB column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE profiles ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- =============================================
-- CREATE PROFILE_VIEWS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS profile_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL,
    viewer_id UUID,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT profile_views_profile_id_fkey
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT profile_views_viewer_id_fkey
        FOREIGN KEY (viewer_id) REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create indexes for profile_views
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_profile_views_profile_id'
    ) THEN
        CREATE INDEX idx_profile_views_profile_id ON profile_views(profile_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_profile_views_viewed_at'
    ) THEN
        CREATE INDEX idx_profile_views_viewed_at ON profile_views(viewed_at DESC);
    END IF;
END $$;

-- =============================================
-- CREATE INDEXES FOR PROFILES TABLE
-- =============================================

DO $$
BEGIN
    -- Index for display_name search
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_profiles_display_name'
    ) THEN
        CREATE INDEX idx_profiles_display_name ON profiles(display_name);
    END IF;

    -- GIN index for interests array search
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_profiles_interests'
    ) THEN
        CREATE INDEX idx_profiles_interests ON profiles USING GIN(interests);
    END IF;

    -- Index for privacy_level filtering
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_profiles_privacy_level'
    ) THEN
        CREATE INDEX idx_profiles_privacy_level ON profiles(privacy_level);
    END IF;

    -- Index for last_active sorting
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_profiles_last_active'
    ) THEN
        CREATE INDEX idx_profiles_last_active ON profiles(last_active DESC);
    END IF;
END $$;

-- =============================================
-- PROFILE COMPLETION CALCULATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
    completion_percentage INTEGER := 0;
    profile_record RECORD;
BEGIN
    SELECT * INTO profile_record FROM profiles WHERE id = profile_id;

    IF profile_record IS NULL THEN
        RETURN 0;
    END IF;

    -- Base completion: account exists (20%)
    completion_percentage := 20;

    -- Display name or full name (15%)
    IF profile_record.display_name IS NOT NULL AND profile_record.display_name != '' THEN
        completion_percentage := completion_percentage + 15;
    ELSIF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
        completion_percentage := completion_percentage + 15;
    END IF;

    -- Avatar (15%)
    IF profile_record.avatar_url IS NOT NULL AND profile_record.avatar_url != '' THEN
        completion_percentage := completion_percentage + 15;
    END IF;

    -- Bio (15%)
    IF profile_record.bio IS NOT NULL AND LENGTH(profile_record.bio) > 20 THEN
        completion_percentage := completion_percentage + 15;
    END IF;

    -- Location (10%)
    IF profile_record.location IS NOT NULL AND profile_record.location != '' THEN
        completion_percentage := completion_percentage + 10;
    END IF;

    -- Interests (10%)
    IF array_length(profile_record.interests, 1) > 0 THEN
        completion_percentage := completion_percentage + 10;
    END IF;

    -- Social links (10%)
    IF profile_record.social_links IS NOT NULL
       AND jsonb_typeof(profile_record.social_links) = 'object'
       AND profile_record.social_links != '{}'::jsonb THEN
        completion_percentage := completion_percentage + 10;
    END IF;

    -- Website (5%)
    IF profile_record.website IS NOT NULL AND profile_record.website != '' THEN
        completion_percentage := completion_percentage + 5;
    END IF;

    RETURN LEAST(completion_percentage, 100);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGER TO UPDATE PROFILE COMPLETION
-- =============================================

CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.profile_complete := (calculate_profile_completion(NEW.id) >= 80);
    NEW.updated_at := NOW();
    NEW.last_active := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS profile_completion_trigger ON profiles;

CREATE TRIGGER profile_completion_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_completion();

-- =============================================
-- UPDATE EXISTING PROFILES UPDATED_AT TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists for profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on profile_views table
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones
DROP POLICY IF EXISTS "Users can view their own profile views" ON profile_views;
DROP POLICY IF EXISTS "Profile views are created for profile visits" ON profile_views;

-- Policy: Users can see who viewed their profile
CREATE POLICY "Users can view their own profile views"
    ON profile_views FOR SELECT
    USING (profile_id = auth.uid());

-- Policy: System can insert profile views (we'll handle this in the API)
CREATE POLICY "Profile views are created for profile visits"
    ON profile_views FOR INSERT
    WITH CHECK (true);

-- Update profiles RLS policies for privacy levels
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view and edit their own profile" ON profiles;
DROP POLICY IF EXISTS "Private profiles are only viewable by owner" ON profiles;

-- Policy: Users can always view and edit their own profile
CREATE POLICY "Users can view and edit their own profile"
    ON profiles FOR ALL
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Policy: Public profiles are viewable by everyone
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (
        privacy_level = 'public'
        OR (privacy_level = 'members_only' AND auth.uid() IS NOT NULL)
        OR id = auth.uid()
    );

-- =============================================
-- INITIAL PROFILE CREATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, member_since, last_active)
    VALUES (
        NEW.id,
        NEW.email,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE profiles IS 'Extended user profiles with social features';
COMMENT ON TABLE profile_views IS 'Tracks profile view analytics';
COMMENT ON COLUMN profiles.privacy_level IS 'Profile visibility: public, members_only, or private';
COMMENT ON COLUMN profiles.interests IS 'Array of user interests/tags';
COMMENT ON COLUMN profiles.social_links IS 'JSON object containing social media links';
COMMENT ON COLUMN profiles.profile_complete IS 'Auto-calculated based on filled fields';
COMMENT ON FUNCTION calculate_profile_completion IS 'Calculates profile completion percentage';

-- =============================================
-- POPULATE EXISTING USERS
-- =============================================

-- Update member_since for existing profiles
UPDATE profiles
SET member_since = COALESCE(created_at, NOW())
WHERE member_since IS NULL;

-- Calculate completion for existing profiles
UPDATE profiles
SET profile_complete = (calculate_profile_completion(id) >= 80)
WHERE profile_complete IS NULL;