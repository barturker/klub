-- Migration: Fix Profile Trigger Function
-- Story: STORY-006
-- Created: 2025-01-15
-- Description: Fixes the profile completion trigger to handle missing fields properly

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS profile_completion_trigger ON profiles;

-- Create a more robust update function that doesn't fail on missing fields
CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update profile_complete if the column exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'profile_complete'
    ) THEN
        NEW.profile_complete := (calculate_profile_completion(NEW.id) >= 80);
    END IF;

    -- Always update timestamps
    NEW.updated_at := NOW();

    -- Update last_active if column exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'last_active'
    ) THEN
        NEW.last_active := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also fix the calculate_profile_completion function to be more robust
CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
    completion_percentage INTEGER := 0;
    profile_record RECORD;
    has_display_name BOOLEAN := FALSE;
    has_full_name BOOLEAN := FALSE;
    has_avatar BOOLEAN := FALSE;
    has_bio BOOLEAN := FALSE;
    has_location BOOLEAN := FALSE;
    has_interests BOOLEAN := FALSE;
    has_social_links BOOLEAN := FALSE;
    has_website BOOLEAN := FALSE;
BEGIN
    -- Get the profile data using dynamic SQL to avoid field errors
    SELECT
        CASE WHEN display_name IS NOT NULL AND display_name != '' THEN TRUE ELSE FALSE END as has_display_name,
        CASE WHEN full_name IS NOT NULL AND full_name != '' THEN TRUE ELSE FALSE END as has_full_name,
        CASE WHEN avatar_url IS NOT NULL AND avatar_url != '' THEN TRUE ELSE FALSE END as has_avatar,
        CASE WHEN bio IS NOT NULL AND LENGTH(bio) > 20 THEN TRUE ELSE FALSE END as has_bio,
        CASE WHEN location IS NOT NULL AND location != '' THEN TRUE ELSE FALSE END as has_location,
        CASE WHEN interests IS NOT NULL AND array_length(interests, 1) > 0 THEN TRUE ELSE FALSE END as has_interests,
        CASE WHEN social_links IS NOT NULL AND social_links != '{}'::jsonb THEN TRUE ELSE FALSE END as has_social_links,
        CASE WHEN website IS NOT NULL AND website != '' THEN TRUE ELSE FALSE END as has_website
    INTO
        has_display_name,
        has_full_name,
        has_avatar,
        has_bio,
        has_location,
        has_interests,
        has_social_links,
        has_website
    FROM profiles
    WHERE id = profile_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Base completion: account exists (20%)
    completion_percentage := 20;

    -- Display name or full name (15%)
    IF has_display_name OR has_full_name THEN
        completion_percentage := completion_percentage + 15;
    END IF;

    -- Avatar (15%)
    IF has_avatar THEN
        completion_percentage := completion_percentage + 15;
    END IF;

    -- Bio (15%)
    IF has_bio THEN
        completion_percentage := completion_percentage + 15;
    END IF;

    -- Location (10%)
    IF has_location THEN
        completion_percentage := completion_percentage + 10;
    END IF;

    -- Interests (10%)
    IF has_interests THEN
        completion_percentage := completion_percentage + 10;
    END IF;

    -- Social links (10%)
    IF has_social_links THEN
        completion_percentage := completion_percentage + 10;
    END IF;

    -- Website (5%)
    IF has_website THEN
        completion_percentage := completion_percentage + 5;
    END IF;

    RETURN LEAST(completion_percentage, 100);
EXCEPTION
    WHEN undefined_column THEN
        -- If any column doesn't exist, just return a basic percentage
        RETURN 20;
    WHEN OTHERS THEN
        -- For any other error, return 0
        RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER profile_completion_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_completion();

-- Also ensure all columns exist (this is idempotent)
DO $$
BEGIN
    -- Add location column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'location'
    ) THEN
        ALTER TABLE profiles ADD COLUMN location TEXT;
    END IF;

    -- Add interests column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'interests'
    ) THEN
        ALTER TABLE profiles ADD COLUMN interests TEXT[] DEFAULT '{}';
    END IF;

    -- Add social_links column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'social_links'
    ) THEN
        ALTER TABLE profiles ADD COLUMN social_links JSONB DEFAULT '{}';
    END IF;

    -- Add display_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'display_name'
    ) THEN
        ALTER TABLE profiles ADD COLUMN display_name TEXT;
    END IF;
END $$;