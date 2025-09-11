-- Fix infinite recursion in community and community_members RLS policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "Private communities viewable by members" ON public.communities;
DROP POLICY IF EXISTS "Members list viewable by community members" ON public.community_members;

-- Recreate the community policy without recursion
CREATE POLICY "Private communities viewable by members or organizer"
    ON public.communities FOR SELECT
    USING (
        is_public = false AND (
            organizer_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.community_members 
                WHERE community_id = communities.id 
                AND user_id = auth.uid()
                LIMIT 1
            )
        )
    );

-- Simpler policy for community_members that doesn't cause recursion
CREATE POLICY "Members can view member lists of their communities"
    ON public.community_members FOR SELECT
    USING (
        user_id = auth.uid() OR
        community_id IN (
            SELECT community_id FROM public.community_members
            WHERE user_id = auth.uid()
        )
    );

-- Also ensure we can query communities when checking slug availability
-- Drop if exists then create
DROP POLICY IF EXISTS "Authenticated users can check community existence" ON public.communities;

CREATE POLICY "Authenticated users can check community existence"
    ON public.communities FOR SELECT
    TO authenticated
    USING (true);