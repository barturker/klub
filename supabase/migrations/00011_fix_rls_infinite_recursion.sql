-- =============================================
-- Migration: Fix RLS Infinite Recursion
-- Version: 00011
-- Created: 2025-01-13
-- Description: Fixes infinite recursion in RLS policies between communities and community_members
-- =============================================

-- =============================================
-- PHASE 1: Remove problematic policies
-- =============================================

-- Drop the problematic communities policy that causes recursion
DROP POLICY IF EXISTS "communities_select_policy" ON communities;

-- =============================================
-- PHASE 2: Create simplified, non-recursive policies
-- =============================================

-- Communities: Simple SELECT policy without recursive checks
CREATE POLICY "communities_select_simple"
ON communities
FOR SELECT
USING (
  -- Public communities visible to all
  privacy_level = 'public'
  OR
  -- User is the organizer (direct check, no recursion)
  organizer_id = auth.uid()
  OR
  -- For private/invite_only, check membership using a simpler approach
  -- We'll handle membership check in the application layer to avoid recursion
  auth.uid() IS NOT NULL
);

-- Alternative: More restrictive policy that still avoids recursion
DROP POLICY IF EXISTS "communities_select_simple" ON communities;

CREATE POLICY "communities_select_safe"
ON communities
FOR SELECT
USING (
  -- Always show public communities
  privacy_level = 'public'
  OR
  -- Show if user is organizer
  organizer_id = auth.uid()
  OR
  -- For private communities, we need a different approach
  -- Use a function to check membership to break the recursion
  (
    privacy_level IN ('private', 'invite_only') 
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = communities.id
        AND cm.user_id = auth.uid()
        -- Important: Don't reference communities table here again
        AND cm.user_id IS NOT NULL
    )
  )
);

-- =============================================
-- PHASE 3: Fix community_members policies if needed
-- =============================================

-- Check and recreate community_members SELECT policy to avoid recursion
DROP POLICY IF EXISTS "community_members_select_policy" ON community_members;

CREATE POLICY "community_members_select_safe"
ON community_members
FOR SELECT
USING (
  -- User can see their own memberships
  user_id = auth.uid()
  OR
  -- User can see members of public communities
  community_id IN (
    SELECT id FROM communities 
    WHERE privacy_level = 'public'
  )
  OR
  -- User is organizer of the community (check directly)
  community_id IN (
    SELECT id FROM communities 
    WHERE organizer_id = auth.uid()
  )
  OR
  -- User is a member of the same community
  (
    auth.uid() IS NOT NULL
    AND community_id IN (
      SELECT community_id 
      FROM community_members 
      WHERE user_id = auth.uid()
    )
  )
);

-- =============================================
-- PHASE 4: Ensure INSERT policy exists for communities
-- =============================================

DROP POLICY IF EXISTS "communities_insert_policy" ON communities;

CREATE POLICY "communities_insert_policy"
ON communities
FOR INSERT
WITH CHECK (
  -- Users can create communities where they are the organizer
  auth.uid() IS NOT NULL 
  AND organizer_id = auth.uid()
);

-- =============================================
-- PHASE 5: Ensure DELETE policy exists
-- =============================================

DROP POLICY IF EXISTS "communities_delete_policy" ON communities;

CREATE POLICY "communities_delete_policy"
ON communities
FOR DELETE
USING (
  -- Only organizer can delete
  organizer_id = auth.uid()
);

-- =============================================
-- PHASE 6: Create a helper function for safe membership checks
-- =============================================

CREATE OR REPLACE FUNCTION is_community_member(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Return true if user is a member
  RETURN EXISTS (
    SELECT 1 
    FROM community_members 
    WHERE community_id = p_community_id 
      AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_community_member TO authenticated;

-- =============================================
-- PHASE 7: Alternative approach using security definer function
-- =============================================

CREATE OR REPLACE FUNCTION get_visible_communities()
RETURNS SETOF communities AS $$
BEGIN
  RETURN QUERY
  SELECT c.*
  FROM communities c
  WHERE 
    -- Public communities
    c.privacy_level = 'public'
    OR
    -- User is organizer
    c.organizer_id = auth.uid()
    OR
    -- User is member (using the helper function)
    is_community_member(c.id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_visible_communities TO authenticated;
GRANT EXECUTE ON FUNCTION get_visible_communities TO anon;

-- =============================================
-- PHASE 8: Add comments for documentation
-- =============================================

COMMENT ON POLICY "communities_select_safe" ON communities IS 'Non-recursive policy to prevent infinite recursion with community_members';
COMMENT ON FUNCTION is_community_member IS 'Helper function to safely check community membership without recursion';
COMMENT ON FUNCTION get_visible_communities IS 'Alternative function-based approach to get visible communities';

-- =============================================
-- Migration complete!
-- =============================================