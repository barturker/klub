-- =============================================
-- Migration: Fix RLS Infinite Recursion
-- Version: 00011
-- Created: 2025-01-12
-- Description: Fixes infinite recursion in community_members RLS policies
-- =============================================

-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Members can view community members" ON community_members;
DROP POLICY IF EXISTS "Members can view other members" ON community_members;
DROP POLICY IF EXISTS "Organizers can manage members" ON community_members;
DROP POLICY IF EXISTS "Users can leave communities" ON community_members;

-- Create fixed policies without recursion
-- View policy: Check community directly, not through another member lookup
CREATE POLICY "View community members"
ON community_members
FOR SELECT
USING (
  -- Anyone can view members of public communities
  EXISTS (
    SELECT 1 FROM communities
    WHERE communities.id = community_members.community_id
    AND (
      communities.privacy_level = 'public'
      OR communities.organizer_id = auth.uid()
    )
  )
  -- OR the user is viewing their own membership
  OR user_id = auth.uid()
);

-- Insert policy: Users can join public communities
CREATE POLICY "Join public communities"
ON community_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM communities
    WHERE communities.id = community_members.community_id
    AND communities.privacy_level = 'public'
  )
);

-- Update policy: Only organizers can update member roles
CREATE POLICY "Organizers update members"
ON community_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM communities
    WHERE communities.id = community_members.community_id
    AND communities.organizer_id = auth.uid()
  )
);

-- Delete policy: Users can leave (delete their own membership) or organizers can remove
CREATE POLICY "Leave or remove members"
ON community_members
FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM communities
    WHERE communities.id = community_members.community_id
    AND communities.organizer_id = auth.uid()
  )
);

-- Also fix communities table policies if they reference community_members
DROP POLICY IF EXISTS "Members can view their communities" ON communities;
DROP POLICY IF EXISTS "Public communities are viewable" ON communities;

-- Simplified community view policy
CREATE POLICY "View communities"
ON communities
FOR SELECT
USING (
  -- Public communities are visible to all
  privacy_level = 'public'
  -- Private communities visible to organizer
  OR organizer_id = auth.uid()
  -- Private communities visible to members (direct check without recursion)
  OR (
    privacy_level IN ('private', 'invite_only')
    AND auth.uid() IN (
      SELECT user_id FROM community_members 
      WHERE community_id = communities.id
    )
  )
);

-- Ensure organizers can always update their communities
CREATE POLICY "Organizers manage communities"
ON communities
FOR ALL
USING (organizer_id = auth.uid())
WITH CHECK (organizer_id = auth.uid());

-- =============================================
-- VERIFY: Test the policies
-- =============================================
-- After this migration, test:
-- 1. Creating a community
-- 2. Viewing community members
-- 3. Joining a community
-- 4. Leaving a community