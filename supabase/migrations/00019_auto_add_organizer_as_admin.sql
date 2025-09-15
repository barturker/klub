-- Auto add community organizer as admin member
-- This migration ensures that when a community is created, the organizer is automatically added as an admin

-- Create function to add organizer as admin
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

-- Create trigger to automatically add organizer as admin when community is created
DROP TRIGGER IF EXISTS add_organizer_as_admin_trigger ON communities;
CREATE TRIGGER add_organizer_as_admin_trigger
    AFTER INSERT ON communities
    FOR EACH ROW
    EXECUTE FUNCTION add_organizer_as_admin();

-- Fix existing communities where organizer is not in community_members
-- This will add all existing organizers as admin members
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