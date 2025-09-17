-- =============================================
-- Migration: Fix Privacy Level and RLS Policies
-- Version: 00031
-- Created: 2025-01-17
-- Description: Properly implement privacy_level and fix RLS policies
-- =============================================

-- =============================================
-- PHASE 1: Data Migration from is_public to privacy_level
-- =============================================

-- First, ensure privacy_level has correct default values
-- Convert is_public to privacy_level values
UPDATE communities
SET privacy_level = CASE
    WHEN is_public = true THEN 'public'
    WHEN is_public = false THEN 'private'
    ELSE 'public'
END
WHERE privacy_level IS NULL;

-- =============================================
-- PHASE 2: Drop all existing RLS policies (temporary ones)
-- =============================================

-- Drop temporary policies from migration #12
DROP POLICY IF EXISTS "communities_select_temp" ON communities;
DROP POLICY IF EXISTS "communities_insert_temp" ON communities;
DROP POLICY IF EXISTS "communities_update_temp" ON communities;
DROP POLICY IF EXISTS "communities_delete_temp" ON communities;

-- Drop any other existing policies
DROP POLICY IF EXISTS "communities_select_policy" ON communities;
DROP POLICY IF EXISTS "communities_insert_policy" ON communities;
DROP POLICY IF EXISTS "communities_update_policy" ON communities;
DROP POLICY IF EXISTS "communities_delete_policy" ON communities;

-- =============================================
-- PHASE 3: Create proper RLS policies based on privacy_level
-- =============================================

-- SELECT Policy: Respect privacy levels
CREATE POLICY "communities_select_privacy"
ON communities
FOR SELECT
USING (
  -- Public communities are visible to everyone (even non-authenticated)
  privacy_level = 'public'
  OR
  -- User is the organizer
  organizer_id = auth.uid()
  OR
  -- User is a member (for private and invite_only communities)
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = communities.id
      AND cm.user_id = auth.uid()
  )
);

-- INSERT Policy: Authenticated users can create communities
CREATE POLICY "communities_insert_auth"
ON communities
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND organizer_id = auth.uid()
);

-- UPDATE Policy: Organizers and admins can update
CREATE POLICY "communities_update_admin"
ON communities
FOR UPDATE
USING (
  organizer_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = communities.id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
  )
)
WITH CHECK (
  organizer_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = communities.id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
  )
);

-- DELETE Policy: Only organizers can delete
CREATE POLICY "communities_delete_organizer"
ON communities
FOR DELETE
USING (organizer_id = auth.uid());

-- =============================================
-- PHASE 4: Fix community_members policies
-- =============================================

-- Drop temporary policies
DROP POLICY IF EXISTS "community_members_select_temp" ON community_members;
DROP POLICY IF EXISTS "community_members_insert_temp" ON community_members;
DROP POLICY IF EXISTS "community_members_delete_temp" ON community_members;

-- SELECT: Members can see other members of their communities
CREATE POLICY "community_members_select_members"
ON community_members
FOR SELECT
USING (
  -- Users can see their own memberships
  user_id = auth.uid()
  OR
  -- Users can see members of communities they belong to
  EXISTS (
    SELECT 1 FROM community_members cm2
    WHERE cm2.community_id = community_members.community_id
      AND cm2.user_id = auth.uid()
  )
  OR
  -- Users can see members of public communities
  EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = community_members.community_id
      AND c.privacy_level = 'public'
  )
);

-- INSERT: Users can join public communities, or be added by admins
CREATE POLICY "community_members_insert_join"
ON community_members
FOR INSERT
WITH CHECK (
  -- User joining themselves to a public community
  (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM communities c
      WHERE c.id = community_members.community_id
        AND c.privacy_level = 'public'
    )
  )
  OR
  -- Admin/organizer adding someone
  EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = community_members.community_id
      AND (
        c.organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM community_members cm
          WHERE cm.community_id = c.id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('admin', 'moderator')
        )
      )
  )
);

-- UPDATE: Only admins/organizers can change roles
CREATE POLICY "community_members_update_admin"
ON community_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = community_members.community_id
      AND (
        c.organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM community_members cm
          WHERE cm.community_id = c.id
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = community_members.community_id
      AND (
        c.organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM community_members cm
          WHERE cm.community_id = c.id
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
        )
      )
  )
);

-- DELETE: Users can leave, admins can remove
CREATE POLICY "community_members_delete_leave"
ON community_members
FOR DELETE
USING (
  -- User leaving themselves
  user_id = auth.uid()
  OR
  -- Admin/organizer removing someone
  EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = community_members.community_id
      AND (
        c.organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM community_members cm
          WHERE cm.community_id = c.id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('admin', 'moderator')
        )
      )
  )
);

-- =============================================
-- PHASE 5: Add computed column for backward compatibility
-- =============================================

-- Add is_private as a generated column for backward compatibility
ALTER TABLE communities
DROP COLUMN IF EXISTS is_private;

ALTER TABLE communities
ADD COLUMN is_private BOOLEAN
GENERATED ALWAYS AS (
  CASE
    WHEN privacy_level IN ('private', 'invite_only') THEN true
    ELSE false
  END
) STORED;

-- =============================================
-- PHASE 6: Create index for performance
-- =============================================

-- Index for filtering by privacy level
DROP INDEX IF EXISTS idx_communities_privacy;
CREATE INDEX idx_communities_privacy
ON communities (privacy_level);

-- Index for is_private computed column
DROP INDEX IF EXISTS idx_communities_is_private;
CREATE INDEX idx_communities_is_private
ON communities (is_private)
WHERE is_private = true;

-- =============================================
-- Migration complete!
-- =============================================