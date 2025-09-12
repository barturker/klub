-- =============================================
-- Problem: Infinite recursion in community_members RLS policies
-- Options: 
--   1. Drop all policies (FORBIDDEN - violates safety rules)
--   2. Add new non-recursive policies with unique names
--   3. Disable RLS (FORBIDDEN - security risk)
-- Decision: Add new policies with unique names that avoid recursion
-- Rollout: Apply to staging first, test, then production
-- Rollback: DROP POLICY IF EXISTS with new policy names only
-- =============================================

-- Migration: Fix RLS Recursion with Additive Approach
-- Version: 00013
-- Created: 2025-01-12
-- Description: Adds new non-recursive policies without removing existing ones
-- =============================================

-- Step 1: Add new VIEW policy that doesn't cause recursion
-- Uses direct auth.uid() check without subqueries on same table
CREATE POLICY "cm_select_own_v2"
ON community_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR community_id IN (
    SELECT id FROM communities 
    WHERE organizer_id = auth.uid()
  )
);

-- Step 2: Add new INSERT policy for joining
CREATE POLICY "cm_insert_self_v2"
ON community_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM communities 
    WHERE id = community_members.community_id 
    AND privacy_level = 'public'
  )
);

-- Step 3: Add new DELETE policy for leaving
CREATE POLICY "cm_delete_self_v2"
ON community_members
FOR DELETE
USING (user_id = auth.uid());

-- Step 4: Add new UPDATE policy for organizers
CREATE POLICY "cm_update_organizer_v2"
ON community_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM communities 
    WHERE id = community_members.community_id 
    AND organizer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM communities 
    WHERE id = community_members.community_id 
    AND organizer_id = auth.uid()
  )
);

-- Note: Old policies remain in place until verified working
-- Next migration will remove old policies after testing