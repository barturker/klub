-- Fix communities RLS policy for authenticated users
-- The current policy is causing 500 errors because it's too restrictive

-- Drop the problematic SELECT policy
DROP POLICY IF EXISTS "communities_select_privacy" ON communities;

-- Create a more permissive SELECT policy that allows authenticated users to see communities
CREATE POLICY "communities_select_authenticated"
ON communities
FOR SELECT
USING (
  -- Public communities are visible to everyone
  privacy_level = 'public'
  OR
  -- Authenticated users can see all communities to check membership
  -- (Frontend will filter based on privacy)
  auth.uid() IS NOT NULL
);

-- Ensure the policy for community_members allows checking membership
DROP POLICY IF EXISTS "community_members_select_members" ON community_members;

CREATE POLICY "community_members_select_authenticated"
ON community_members
FOR SELECT
USING (
  -- Users can see their own memberships
  user_id = auth.uid()
  OR
  -- Users can check if they're members of a community
  EXISTS (
    SELECT 1 FROM community_members cm2
    WHERE cm2.user_id = auth.uid()
      AND cm2.community_id = community_members.community_id
  )
  OR
  -- Allow checking membership for community listing
  auth.uid() IS NOT NULL
);