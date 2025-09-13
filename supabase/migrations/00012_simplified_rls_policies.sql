-- =============================================
-- Migration: Simplified RLS Policies
-- Version: 00012
-- Created: 2025-01-13
-- Description: Completely removes recursive RLS and implements simpler policies
-- =============================================

-- =============================================
-- PHASE 1: Drop ALL existing policies to start fresh
-- =============================================

-- Drop all communities policies
DROP POLICY IF EXISTS "communities_select_policy" ON communities;
DROP POLICY IF EXISTS "communities_select_simple" ON communities;
DROP POLICY IF EXISTS "communities_select_safe" ON communities;
DROP POLICY IF EXISTS "communities_insert_policy" ON communities;
DROP POLICY IF EXISTS "communities_update_policy" ON communities;
DROP POLICY IF EXISTS "communities_delete_policy" ON communities;

-- Drop all community_members policies
DROP POLICY IF EXISTS "community_members_select_policy" ON community_members;
DROP POLICY IF EXISTS "community_members_select_safe" ON community_members;
DROP POLICY IF EXISTS "community_members_insert_policy" ON community_members;
DROP POLICY IF EXISTS "community_members_update_policy" ON community_members;
DROP POLICY IF EXISTS "community_members_delete_policy" ON community_members;

-- =============================================
-- PHASE 2: Temporarily disable RLS to test
-- =============================================

-- NOTE: This is temporary for debugging
-- We'll re-enable with proper policies

-- Keep RLS enabled but with permissive policies temporarily
-- This helps identify if RLS is the issue

-- =============================================
-- PHASE 3: Create VERY SIMPLE policies
-- =============================================

-- Communities: Allow all authenticated users to SELECT all communities
-- This is temporary to fix the immediate issue
CREATE POLICY "communities_select_temp"
ON communities
FOR SELECT
USING (true);  -- Allow all reads temporarily

-- Communities: INSERT only for authenticated users as organizer
CREATE POLICY "communities_insert_temp"
ON communities
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND organizer_id = auth.uid()
);

-- Communities: UPDATE only for organizers
CREATE POLICY "communities_update_temp"
ON communities
FOR UPDATE
USING (organizer_id = auth.uid())
WITH CHECK (organizer_id = auth.uid());

-- Communities: DELETE only for organizers
CREATE POLICY "communities_delete_temp"
ON communities
FOR DELETE
USING (organizer_id = auth.uid());

-- =============================================
-- PHASE 4: Simple community_members policies
-- =============================================

-- Community members: Allow reading all memberships (temporary)
CREATE POLICY "community_members_select_temp"
ON community_members
FOR SELECT
USING (true);  -- Allow all reads temporarily

-- Community members: Users can join communities
CREATE POLICY "community_members_insert_temp"
ON community_members
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);

-- Community members: Users can leave (delete their membership)
CREATE POLICY "community_members_delete_temp"
ON community_members
FOR DELETE
USING (user_id = auth.uid());

-- =============================================
-- PHASE 5: Add comment explaining temporary nature
-- =============================================

COMMENT ON POLICY "communities_select_temp" ON communities IS 'TEMPORARY: Permissive policy to fix infinite recursion issue';
COMMENT ON POLICY "community_members_select_temp" ON community_members IS 'TEMPORARY: Permissive policy to fix infinite recursion issue';

-- =============================================
-- Migration complete!
-- Next steps: After verifying this works, create proper non-recursive policies
-- =============================================