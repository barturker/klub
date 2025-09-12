-- =============================================
-- Problem: RLS policies causing infinite recursion
-- Decision: Temporarily simplify policies to break recursion
-- This is a TEMPORARY fix until proper policies are designed
-- =============================================

-- Migration: Temporary Fix for Recursion
-- Version: 00014
-- Created: 2025-01-12

-- Step 1: Drop the problematic "View communities" policy that references community_members
DROP POLICY IF EXISTS "View communities" ON communities;

-- Step 2: Create a simpler policy for communities without recursion
CREATE POLICY "communities_simple_view"
ON communities
FOR SELECT
USING (
  -- Public communities visible to all
  privacy_level = 'public'
  -- Or user is the organizer
  OR organizer_id = auth.uid()
);

-- Step 3: Simplify community_members policies
DROP POLICY IF EXISTS "cm_select_own_v2" ON community_members;

-- Create ultra-simple policy - users only see their own memberships
CREATE POLICY "cm_simple_own_only"
ON community_members
FOR SELECT
USING (user_id = auth.uid());

-- Step 4: Allow community creation/update for authenticated users
CREATE POLICY "communities_insert_authenticated"
ON communities
FOR INSERT
WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "communities_update_organizer"
ON communities
FOR UPDATE
USING (organizer_id = auth.uid())
WITH CHECK (organizer_id = auth.uid());

-- Note: This is a TEMPORARY solution
-- TODO: Design proper non-recursive policies after testing