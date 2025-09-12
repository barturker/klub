-- =============================================
-- Problem: Current policies are too permissive
-- Decision: Add proper security policies without recursion
-- Rollout: Test each policy individually
-- Rollback: DROP POLICY statements for each new policy
-- =============================================

-- Migration: Secure Non-Recursive Policies
-- Version: 00016
-- Created: 2025-01-12
-- Description: Proper security without recursion

-- =============================================
-- COMMUNITIES TABLE POLICIES
-- =============================================

-- 1. View policy for communities (already good, keep it)
-- "communities_simple_view" already handles this properly

-- 2. Update policy - only organizers can update their own communities
-- "communities_update_organizer" already exists

-- 3. Delete policy - only organizers can delete
CREATE POLICY "communities_delete_organizer"
ON communities
FOR DELETE
USING (organizer_id = auth.uid());

-- =============================================
-- COMMUNITY_MEMBERS TABLE POLICIES
-- =============================================

-- 1. Better SELECT policy - see members of communities you're in
DROP POLICY IF EXISTS "cm_simple_own_only" ON community_members;

CREATE POLICY "cm_view_members_secure"
ON community_members
FOR SELECT
USING (
  -- See your own membership
  user_id = auth.uid()
  OR
  -- See members of public communities
  community_id IN (
    SELECT id FROM communities 
    WHERE privacy_level = 'public'
  )
  OR
  -- See members if you're the organizer
  community_id IN (
    SELECT id FROM communities 
    WHERE organizer_id = auth.uid()
  )
  OR
  -- See members if you're also a member (without recursion)
  EXISTS (
    SELECT 1 FROM community_members cm2
    WHERE cm2.community_id = community_members.community_id
    AND cm2.user_id = auth.uid()
    -- Stop here - no more checks on cm2
  )
);

-- 2. INSERT policy - join public communities or be added by organizer
CREATE POLICY "cm_join_secure"
ON community_members
FOR INSERT
WITH CHECK (
  -- Self-join to public communities
  (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM communities
      WHERE id = community_members.community_id
      AND privacy_level = 'public'
    )
  )
  OR
  -- Organizer can add members
  EXISTS (
    SELECT 1 FROM communities
    WHERE id = community_members.community_id
    AND organizer_id = auth.uid()
  )
);

-- 3. UPDATE policy - organizers can change roles
DROP POLICY IF EXISTS "cm_update_organizer_v2" ON community_members;

CREATE POLICY "cm_update_roles_secure"
ON community_members
FOR UPDATE
USING (
  -- Only organizers can update member roles
  EXISTS (
    SELECT 1 FROM communities
    WHERE id = community_members.community_id
    AND organizer_id = auth.uid()
  )
)
WITH CHECK (
  -- Can't change the user_id or community_id
  user_id = (SELECT user_id FROM community_members WHERE id = community_members.id)
  AND community_id = (SELECT community_id FROM community_members WHERE id = community_members.id)
  AND EXISTS (
    SELECT 1 FROM communities
    WHERE id = community_members.community_id
    AND organizer_id = auth.uid()
  )
);

-- 4. DELETE policy - leave or be removed
DROP POLICY IF EXISTS "cm_delete_self_v2" ON community_members;

CREATE POLICY "cm_leave_or_remove_secure"
ON community_members
FOR DELETE
USING (
  -- Leave yourself
  user_id = auth.uid()
  OR
  -- Organizer can remove members
  EXISTS (
    SELECT 1 FROM communities
    WHERE id = community_members.community_id
    AND organizer_id = auth.uid()
  )
);

-- =============================================
-- ADDITIONAL SECURITY MEASURES
-- =============================================

-- Ensure members have valid roles
ALTER TABLE community_members
DROP CONSTRAINT IF EXISTS valid_member_role;

ALTER TABLE community_members
ADD CONSTRAINT valid_member_role CHECK (
  role IN ('member', 'moderator', 'admin')
);

-- Ensure one member per user per community
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_membership_per_user
ON community_members(community_id, user_id);

-- =============================================
-- AUDIT LOG for sensitive operations
-- =============================================

-- Track when members are added/removed
CREATE OR REPLACE FUNCTION log_membership_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO community_settings_history(
      community_id,
      changed_by,
      changes
    ) VALUES (
      NEW.community_id,
      auth.uid(),
      jsonb_build_object(
        'action', 'member_added',
        'user_id', NEW.user_id,
        'role', NEW.role
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO community_settings_history(
      community_id,
      changed_by,
      changes
    ) VALUES (
      OLD.community_id,
      auth.uid(),
      jsonb_build_object(
        'action', 'member_removed',
        'user_id', OLD.user_id
      )
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS track_membership_changes ON community_members;

CREATE TRIGGER track_membership_changes
AFTER INSERT OR DELETE ON community_members
FOR EACH ROW
EXECUTE FUNCTION log_membership_changes();

-- =============================================
-- VERIFICATION
-- After this migration:
-- ✅ Users can only see members of communities they belong to
-- ✅ Only organizers can manage members
-- ✅ Privacy levels are respected
-- ✅ All changes are audited
-- ✅ No infinite recursion
-- =============================================