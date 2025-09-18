-- =============================================
-- Migration: Fix RLS Infinite Recursion in community_members
-- Version: 00039
-- Created: 2025-01-18
-- Description: Remove self-referencing queries causing infinite recursion
-- =============================================

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "community_members_select_authenticated" ON community_members;
DROP POLICY IF EXISTS "community_members_select_members" ON community_members;

-- Create a simpler SELECT policy without self-referencing
CREATE POLICY "community_members_select_simple"
ON community_members
FOR SELECT
USING (
  -- Users can always see their own memberships
  user_id = auth.uid()
  OR
  -- Authenticated users can see members of public communities
  EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = community_members.community_id
      AND c.privacy_level = 'public'
  )
  OR
  -- Community organizers can see all their community members
  EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = community_members.community_id
      AND c.organizer_id = auth.uid()
  )
);

-- Fix INSERT policy to avoid recursion
DROP POLICY IF EXISTS "community_members_insert_join" ON community_members;

CREATE POLICY "community_members_insert_simple"
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
  -- Organizer adding someone to their community
  EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = community_members.community_id
      AND c.organizer_id = auth.uid()
  )
);

-- Fix UPDATE policy to avoid recursion
DROP POLICY IF EXISTS "community_members_update_admin" ON community_members;

CREATE POLICY "community_members_update_simple"
ON community_members
FOR UPDATE
USING (
  -- Only community organizers can update member roles
  EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = community_members.community_id
      AND c.organizer_id = auth.uid()
  )
)
WITH CHECK (
  -- Only community organizers can update member roles
  EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = community_members.community_id
      AND c.organizer_id = auth.uid()
  )
);

-- Fix DELETE policy to avoid recursion
DROP POLICY IF EXISTS "community_members_delete_leave" ON community_members;

CREATE POLICY "community_members_delete_simple"
ON community_members
FOR DELETE
USING (
  -- User leaving themselves
  user_id = auth.uid()
  OR
  -- Organizer removing someone
  EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = community_members.community_id
      AND c.organizer_id = auth.uid()
  )
);

-- =============================================
-- Ensure Bartu's membership in ZIMBADS is properly set
-- =============================================

-- First ensure Bartu is in community_members as admin
INSERT INTO community_members (community_id, user_id, role, joined_at)
VALUES (
  '425ed2b0-f1fb-49a0-97b0-08da0d3901b0', -- ZIMBADS community
  '4e91b95a-a446-4668-90c4-aec5698eeff8', -- Bartu's user ID
  'admin',
  NOW()
)
ON CONFLICT (community_id, user_id)
DO UPDATE SET
  role = 'admin',
  joined_at = COALESCE(community_members.joined_at, NOW());

-- Verify ZIMBADS community settings
UPDATE communities
SET
  organizer_id = '4e91b95a-a446-4668-90c4-aec5698eeff8',
  privacy_level = 'private',
  is_public = false
WHERE id = '425ed2b0-f1fb-49a0-97b0-08da0d3901b0';

-- =============================================
-- Migration complete!
-- =============================================