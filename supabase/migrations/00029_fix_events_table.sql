-- Drop old events table and recreate with correct schema
-- This migration fixes the event_type column issue

-- First drop all dependent objects
DROP TABLE IF EXISTS public.events CASCADE;

-- Create events table with correct schema
CREATE TABLE public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Basic event information
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  event_type TEXT CHECK (event_type IN ('physical', 'virtual', 'hybrid')) DEFAULT 'physical',
  status TEXT CHECK (status IN ('draft', 'published', 'cancelled', 'completed')) DEFAULT 'draft',

  -- Date and time
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',

  -- Location information (for physical/hybrid events)
  venue_name TEXT,
  venue_address TEXT,
  venue_city TEXT,
  venue_country TEXT,

  -- Online information (for virtual/hybrid events)
  online_url TEXT,

  -- Event details
  capacity INTEGER DEFAULT 0 CHECK (capacity >= 0),
  image_url TEXT,

  -- Recurring event support
  recurring_rule TEXT DEFAULT NULL,
  recurring_end_date TIMESTAMPTZ DEFAULT NULL,
  parent_event_id UUID REFERENCES public.events(id) ON DELETE CASCADE DEFAULT NULL,

  -- Additional metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT events_slug_community_unique UNIQUE(community_id, slug),
  CONSTRAINT events_end_after_start CHECK (end_at > start_at)
);

-- Create indexes for performance
CREATE INDEX idx_events_community ON public.events(community_id);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_start ON public.events(start_at);
CREATE INDEX idx_events_slug ON public.events(slug);
CREATE INDEX idx_events_created_by ON public.events(created_by);
CREATE INDEX idx_events_parent_event ON public.events(parent_event_id);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Published events are viewable by everyone
CREATE POLICY "Published events are publicly viewable"
ON public.events
FOR SELECT
USING (
  status = 'published'
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_members cm
    WHERE cm.community_id = events.community_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'moderator')
  )
);

-- Policy: Community admins and moderators can create events
CREATE POLICY "Community managers can create events"
ON public.events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.community_members cm
    WHERE cm.community_id = events.community_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'moderator')
  )
);

-- Policy: Event creators and admins can update events
CREATE POLICY "Event creators and admins can update events"
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

-- Policy: Only community admins can delete events
CREATE POLICY "Community admins can delete events"
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