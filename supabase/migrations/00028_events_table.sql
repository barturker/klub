-- Create events table for community event management
-- Includes support for physical, virtual, and hybrid events with recurring patterns

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
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
  recurring_rule TEXT DEFAULT NULL, -- RRULE format (RFC 5545)
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
  CONSTRAINT events_end_after_start CHECK (end_at > start_at),
  CONSTRAINT events_recurring_with_rule CHECK (
    (recurring_rule IS NULL AND recurring_end_date IS NULL) OR
    (recurring_rule IS NOT NULL)
  ),
  CONSTRAINT events_venue_for_physical CHECK (
    event_type = 'virtual' OR
    (event_type IN ('physical', 'hybrid') AND venue_name IS NOT NULL)
  ),
  CONSTRAINT events_online_url_for_virtual CHECK (
    event_type = 'physical' OR
    (event_type IN ('virtual', 'hybrid') AND online_url IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_community ON public.events(community_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_start ON public.events(start_at);
CREATE INDEX IF NOT EXISTS idx_events_end ON public.events(end_at);
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_parent_event ON public.events(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_events_published_start ON public.events(start_at) WHERE status = 'published';

-- Add GIN index for tags array search
CREATE INDEX IF NOT EXISTS idx_events_tags ON public.events USING GIN (tags);

-- Add GIN index for metadata JSONB search
CREATE INDEX IF NOT EXISTS idx_events_metadata ON public.events USING GIN (metadata);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Published events are viewable by everyone
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

-- Function to generate unique event slug
CREATE OR REPLACE FUNCTION generate_event_slug(p_title TEXT, p_community_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_slug TEXT;
  v_counter INTEGER := 0;
  v_exists BOOLEAN;
BEGIN
  -- Generate base slug from title
  v_slug := lower(p_title);
  -- Remove special characters and replace with hyphens
  v_slug := regexp_replace(v_slug, '[^a-z0-9\s-]', '', 'g');
  -- Replace spaces with hyphens
  v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
  -- Remove multiple consecutive hyphens
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  -- Trim hyphens from both ends
  v_slug := trim(both '-' from v_slug);

  -- Ensure slug is not empty
  IF v_slug = '' OR v_slug IS NULL THEN
    v_slug := 'event';
  END IF;

  -- Check for uniqueness and add counter if needed
  LOOP
    IF v_counter > 0 THEN
      v_exists := EXISTS (
        SELECT 1 FROM public.events
        WHERE community_id = p_community_id
        AND slug = v_slug || '-' || v_counter
      );
      IF NOT v_exists THEN
        RETURN v_slug || '-' || v_counter;
      END IF;
    ELSE
      v_exists := EXISTS (
        SELECT 1 FROM public.events
        WHERE community_id = p_community_id
        AND slug = v_slug
      );
      IF NOT v_exists THEN
        RETURN v_slug;
      END IF;
    END IF;
    v_counter := v_counter + 1;

    -- Safety check to prevent infinite loop
    IF v_counter > 999 THEN
      RAISE EXCEPTION 'Could not generate unique slug after 999 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically set slug on insert if not provided
CREATE OR REPLACE FUNCTION set_event_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate slug if not provided or empty
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_event_slug(NEW.title, NEW.community_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set slug before insert
CREATE TRIGGER set_event_slug_trigger
BEFORE INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION set_event_slug();

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER update_event_updated_at_trigger
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION update_event_updated_at();

-- Function to validate event dates and times
CREATE OR REPLACE FUNCTION validate_event_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure end time is after start time
  IF NEW.end_at <= NEW.start_at THEN
    RAISE EXCEPTION 'Event end time must be after start time';
  END IF;

  -- For recurring events, ensure recurring_end_date is after start_at
  IF NEW.recurring_rule IS NOT NULL AND NEW.recurring_end_date IS NOT NULL THEN
    IF NEW.recurring_end_date <= NEW.start_at THEN
      RAISE EXCEPTION 'Recurring end date must be after event start time';
    END IF;
  END IF;

  -- Draft events can have past dates, but published events should be future dates
  IF NEW.status = 'published' AND OLD.status = 'draft' THEN
    IF NEW.start_at < NOW() THEN
      -- Allow if event starts within the next hour (for immediate events)
      IF NEW.start_at < NOW() - INTERVAL '1 hour' THEN
        RAISE EXCEPTION 'Cannot publish events with start time in the past';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate dates before insert or update
CREATE TRIGGER validate_event_dates_trigger
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION validate_event_dates();

-- Function to handle cascading status changes for child events
CREATE OR REPLACE FUNCTION cascade_event_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If a parent event is cancelled, cancel all child events
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.parent_event_id IS NULL THEN
    UPDATE public.events
    SET status = 'cancelled'
    WHERE parent_event_id = NEW.id
    AND status != 'cancelled';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cascade status changes to child events
CREATE TRIGGER cascade_event_status_trigger
AFTER UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION cascade_event_status_change();

-- Add comment on the table
COMMENT ON TABLE public.events IS 'Stores community events with support for physical, virtual, hybrid, and recurring events';
COMMENT ON COLUMN public.events.recurring_rule IS 'RRULE format (RFC 5545) for defining recurring patterns';
COMMENT ON COLUMN public.events.parent_event_id IS 'References the parent event for recurring event instances';
COMMENT ON COLUMN public.events.event_type IS 'Type of event: physical (in-person), virtual (online), or hybrid (both)';
COMMENT ON COLUMN public.events.capacity IS 'Maximum number of attendees, 0 means unlimited';