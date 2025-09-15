-- Fix community triggers that reference non-existent columns
-- This migration fixes the issue where a trigger is trying to use 'changes' column
-- in community_settings_history table which doesn't exist

-- First, drop any problematic triggers that might be causing issues
DO $$
BEGIN
    -- Drop any existing triggers that might be using wrong column names
    DROP TRIGGER IF EXISTS log_community_changes ON communities;
    DROP TRIGGER IF EXISTS audit_community_changes ON communities;
    DROP TRIGGER IF EXISTS track_community_changes ON communities;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some triggers may not exist, continuing...';
END $$;

-- Drop any problematic functions that might reference 'changes' column
DO $$
BEGIN
    DROP FUNCTION IF EXISTS log_community_changes() CASCADE;
    DROP FUNCTION IF EXISTS audit_community_changes() CASCADE;
    DROP FUNCTION IF EXISTS track_community_changes() CASCADE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some functions may not exist, continuing...';
END $$;

-- Recreate the correct trigger for adding organizer as admin
-- (This is already in migration 00019 but let's ensure it's correct)
CREATE OR REPLACE FUNCTION add_organizer_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Add the organizer as an admin member of the community
    INSERT INTO community_members (community_id, user_id, role, joined_at)
    VALUES (NEW.id, NEW.organizer_id, 'admin', NOW())
    ON CONFLICT (community_id, user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the trigger
        RAISE WARNING 'Failed to add organizer as admin: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS add_organizer_as_admin_trigger ON communities;
CREATE TRIGGER add_organizer_as_admin_trigger
    AFTER INSERT ON communities
    FOR EACH ROW
    EXECUTE FUNCTION add_organizer_as_admin();

-- Fix any existing communities where organizer is not a member
DO $$
BEGIN
    INSERT INTO community_members (community_id, user_id, role, joined_at)
    SELECT
        c.id as community_id,
        c.organizer_id as user_id,
        'admin'::member_role as role,
        c.created_at as joined_at
    FROM communities c
    LEFT JOIN community_members cm ON c.id = cm.community_id AND c.organizer_id = cm.user_id
    WHERE cm.id IS NULL
    ON CONFLICT (community_id, user_id) DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail
        RAISE NOTICE 'Error adding existing organizers: %', SQLERRM;
END $$;

-- Update existing organizers who are members but not admins
UPDATE community_members cm
SET role = 'admin'
FROM communities c
WHERE cm.community_id = c.id
    AND cm.user_id = c.organizer_id
    AND cm.role != 'admin';

-- Add comment for documentation
COMMENT ON FUNCTION add_organizer_as_admin() IS 'Automatically adds the community organizer as an admin member when a community is created';
COMMENT ON TRIGGER add_organizer_as_admin_trigger ON communities IS 'Ensures community organizers are automatically added as admin members';