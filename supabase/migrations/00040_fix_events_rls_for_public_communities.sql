-- Fix events RLS policies for public community visibility
-- The issue: Events weren't showing even though they exist in database
-- Root cause: RLS policies were too restrictive for public communities

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Published events are publicly viewable" ON public.events;

-- Create a more permissive SELECT policy for events
-- This allows viewing events if:
-- 1. They are published AND community is public
-- 2. User created the event
-- 3. User is a member of the community (any role)
CREATE POLICY "Events viewable based on community privacy"
ON public.events
FOR SELECT
USING (
  -- Published events in public communities are viewable by everyone
  (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = events.community_id
      AND c.privacy_level = 'public'
    )
  )
  -- Draft events viewable by creator
  OR created_by = auth.uid()
  -- All events viewable by community members (including regular members)
  OR EXISTS (
    SELECT 1 FROM public.community_members cm
    WHERE cm.community_id = events.community_id
    AND cm.user_id = auth.uid()
  )
);

-- Also update INSERT policy to be clearer
DROP POLICY IF EXISTS "Community managers can create events" ON public.events;

CREATE POLICY "Active community members can create events"
ON public.events
FOR INSERT
WITH CHECK (
  -- Only admins and moderators can create events
  EXISTS (
    SELECT 1 FROM public.community_members cm
    WHERE cm.community_id = events.community_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'moderator')
  )
);

-- Update the UPDATE policy for consistency
DROP POLICY IF EXISTS "Event creators and admins can update events" ON public.events;

CREATE POLICY "Event creators and community admins can update"
ON public.events
FOR UPDATE
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_members cm
    WHERE cm.community_id = events.community_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'admin'
  )
)
WITH CHECK (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_members cm
    WHERE cm.community_id = events.community_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'admin'
  )
);

-- Update DELETE policy for consistency
DROP POLICY IF EXISTS "Community admins can delete events" ON public.events;

CREATE POLICY "Only community admins can delete events"
ON public.events
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.community_members cm
    WHERE cm.community_id = events.community_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'admin'
  )
);