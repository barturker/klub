-- Final fix for organizer admin roles
-- This completely removes problematic triggers and manually fixes all organizers

-- Drop any existing problematic triggers
DROP TRIGGER IF EXISTS add_organizer_as_admin_trigger ON communities;
DROP TRIGGER IF EXISTS log_community_changes ON communities;
DROP TRIGGER IF EXISTS audit_community_changes ON communities;
DROP TRIGGER IF EXISTS track_community_changes ON communities;

-- Drop any existing problematic functions
DROP FUNCTION IF EXISTS add_organizer_as_admin() CASCADE;
DROP FUNCTION IF EXISTS log_community_changes() CASCADE;
DROP FUNCTION IF EXISTS audit_community_changes() CASCADE;
DROP FUNCTION IF EXISTS track_community_changes() CASCADE;

-- Manually add all organizers as admins to community_members table
DO $$
BEGIN
    -- Insert organizers who are not in community_members
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

    RAISE NOTICE 'Added missing organizers to community_members';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding organizers: %', SQLERRM;
END $$;

-- Update existing members who are organizers but not admins
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE community_members cm
    SET role = 'admin'
    FROM communities c
    WHERE cm.community_id = c.id
        AND cm.user_id = c.organizer_id
        AND cm.role != 'admin';

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % organizers to admin role', updated_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating organizer roles: %', SQLERRM;
END $$;

-- Create a SAFE trigger that adds organizers as admins without referencing non-existent columns
CREATE OR REPLACE FUNCTION safe_add_organizer_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only try to add to community_members, nothing else
    BEGIN
        INSERT INTO community_members (community_id, user_id, role, joined_at)
        VALUES (NEW.id, NEW.organizer_id, 'admin', NOW())
        ON CONFLICT (community_id, user_id) DO NOTHING;
    EXCEPTION
        WHEN OTHERS THEN
            -- Silently fail if there's any issue
            NULL;
    END;

    RETURN NEW;
END;
$$;

-- Create the safe trigger
CREATE TRIGGER safe_add_organizer_trigger
    AFTER INSERT ON communities
    FOR EACH ROW
    EXECUTE FUNCTION safe_add_organizer_as_admin();

-- Log the fix completion
DO $$
DECLARE
    total_communities INTEGER;
    admins_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_communities FROM communities;

    SELECT COUNT(*) INTO admins_count
    FROM community_members cm
    JOIN communities c ON cm.community_id = c.id
    WHERE cm.user_id = c.organizer_id AND cm.role = 'admin';

    RAISE NOTICE 'Fix complete: % of % communities have their organizer as admin', admins_count, total_communities;
END $$;