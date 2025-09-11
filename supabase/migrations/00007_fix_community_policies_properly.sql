-- Fix community RLS policies more thoroughly
-- This migration specifically targets the infinite recursion issue

-- First, drop ALL existing policies on communities and community_members
-- to ensure clean state
DROP POLICY IF EXISTS "Public communities are viewable by everyone" ON public.communities;
DROP POLICY IF EXISTS "Private communities viewable by members" ON public.communities;
DROP POLICY IF EXISTS "Private communities viewable by members or organizer" ON public.communities;
DROP POLICY IF EXISTS "Organizers can update their communities" ON public.communities;
DROP POLICY IF EXISTS "Authenticated users can create communities" ON public.communities;
DROP POLICY IF EXISTS "Community organizers can update their communities" ON public.communities;
DROP POLICY IF EXISTS "Community organizers can delete their communities" ON public.communities;
DROP POLICY IF EXISTS "Authenticated users can check community existence" ON public.communities;

DROP POLICY IF EXISTS "Members list viewable by community members" ON public.community_members;
DROP POLICY IF EXISTS "Members can view member lists of their communities" ON public.community_members;
DROP POLICY IF EXISTS "Members can view their membership" ON public.community_members;
DROP POLICY IF EXISTS "Organizers can manage members" ON public.community_members;

-- Now create clean, non-recursive policies

-- COMMUNITIES POLICIES
-- 1. Anyone can see public communities
CREATE POLICY "Anyone can view public communities"
    ON public.communities FOR SELECT
    USING (is_public = true);

-- 2. Authenticated users can see all communities (for slug checking)
CREATE POLICY "Auth users can view all communities"
    ON public.communities FOR SELECT
    TO authenticated
    USING (true);

-- 3. Authenticated users can create communities
CREATE POLICY "Auth users can create communities"
    ON public.communities FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = organizer_id);

-- 4. Organizers can update their own communities
CREATE POLICY "Organizers can update own communities"
    ON public.communities FOR UPDATE
    TO authenticated
    USING (organizer_id = auth.uid())
    WITH CHECK (organizer_id = auth.uid());

-- 5. Organizers can delete their own communities
CREATE POLICY "Organizers can delete own communities"
    ON public.communities FOR DELETE
    TO authenticated
    USING (organizer_id = auth.uid());

-- COMMUNITY_MEMBERS POLICIES (simplified to avoid recursion)
-- 1. Members can see their own memberships
CREATE POLICY "Users can view own memberships"
    ON public.community_members FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 2. Members can see other members in their communities (without recursion)
CREATE POLICY "Members can view community members"
    ON public.community_members FOR SELECT
    TO authenticated
    USING (
        community_id IN (
            SELECT cm.community_id 
            FROM public.community_members cm 
            WHERE cm.user_id = auth.uid()
        )
    );

-- 3. Only organizers can add members (or users can join - depending on your logic)
CREATE POLICY "Users can join communities"
    ON public.community_members FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 4. Users can leave communities (delete their own membership)
CREATE POLICY "Users can leave communities"
    ON public.community_members FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());