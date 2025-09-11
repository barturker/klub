-- Migration: Complete RLS, Search Triggers, and Final Constraints
-- Description: Production-ready RLS policies, search triggers, and remaining constraints

-- 1) Safety: required extensions (no-op if present)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2) Constraints & indexes

-- One pass per ticket (enforces the isOneToOne you modeled)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'passes_ticket_unique'
    ) THEN
        ALTER TABLE public.passes
        ADD CONSTRAINT passes_ticket_unique UNIQUE (ticket_id);
    END IF;
END $$;

-- Secure code must be unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_passes_secure_code_unique
ON public.passes(secure_code);

-- Case-insensitive community slug uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_communities_slug_ci
ON public.communities (LOWER(slug));

-- Event hot paths: browse by community & status & time
CREATE INDEX IF NOT EXISTS idx_events_community_status_start
ON public.events(community_id, status, start_at DESC);

-- Tickets by event & status (check-in/backoffice)
CREATE INDEX IF NOT EXISTS idx_tickets_event_status
ON public.tickets(event_id, status);

-- Orders by event, status, created_at (reporting)
CREATE INDEX IF NOT EXISTS idx_orders_event_status_created
ON public.orders(event_id, status, created_at DESC);

-- One successful check-in per ticket
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_ticket_once_success
ON public.checkins(ticket_id)
WHERE result = 'success';

-- 3) (Re)assert the new foreign keys (safe if not present yet)

-- orders.buyer_id → profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_buyer_fk'
    ) THEN
        ALTER TABLE public.orders
        ADD CONSTRAINT orders_buyer_fk
        FOREIGN KEY (buyer_id) REFERENCES public.profiles(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- events.created_by → profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'events_created_by_fk'
    ) THEN
        ALTER TABLE public.events
        ADD CONSTRAINT events_created_by_fk
        FOREIGN KEY (created_by) REFERENCES public.profiles(id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- checkins.scanned_by → profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'checkins_scanned_by_fk'
    ) THEN
        ALTER TABLE public.checkins
        ADD CONSTRAINT checkins_scanned_by_fk
        FOREIGN KEY (scanned_by) REFERENCES public.profiles(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- passes.ticket_id is already FK to tickets.id; ensure ON DELETE CASCADE (recommended)
DO $$
BEGIN
    -- First drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'passes_ticket_id_fkey'
    ) THEN
        ALTER TABLE public.passes DROP CONSTRAINT passes_ticket_id_fkey;
    END IF;
    
    -- Add constraint with CASCADE
    ALTER TABLE public.passes
    ADD CONSTRAINT passes_ticket_id_fkey
    FOREIGN KEY (ticket_id) REFERENCES public.tickets(id)
    ON DELETE CASCADE;
END $$;

-- 4) Row Level Security (RLS)

-- Enable RLS
ALTER TABLE public.events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Drop default-allow (if any) and old policies
DROP POLICY IF EXISTS "events_all"   ON public.events;
DROP POLICY IF EXISTS "orders_all"   ON public.orders;
DROP POLICY IF EXISTS "tickets_all"  ON public.tickets;
DROP POLICY IF EXISTS "passes_all"   ON public.passes;
DROP POLICY IF EXISTS "checkins_all" ON public.checkins;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "events_select_published" ON public.events;
DROP POLICY IF EXISTS "events_select_owner" ON public.events;
DROP POLICY IF EXISTS "events_write_owner" ON public.events;
DROP POLICY IF EXISTS "orders_select_buyer" ON public.orders;
DROP POLICY IF EXISTS "orders_select_owner" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_buyer" ON public.orders;
DROP POLICY IF EXISTS "tickets_select_owner" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select_event_owner" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert_owner" ON public.tickets;
DROP POLICY IF EXISTS "passes_select_ticket_owner" ON public.passes;
DROP POLICY IF EXISTS "passes_select_event_owner" ON public.passes;
DROP POLICY IF EXISTS "checkins_select_event_owner" ON public.checkins;

-- EVENTS
-- Anyone can read published events
CREATE POLICY events_select_published
ON public.events
FOR SELECT
USING (status = 'published');

-- Creators (and staff, if you later model memberships) can read their drafts
CREATE POLICY events_select_owner
ON public.events
FOR SELECT
USING (created_by = auth.uid());

-- Only creators can insert/update their events
CREATE POLICY events_write_owner
ON public.events
FOR ALL
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- ORDERS
-- Buyer can see their orders
CREATE POLICY orders_select_buyer
ON public.orders
FOR SELECT
USING (buyer_id = auth.uid());

-- Event owner can see orders for their events
CREATE POLICY orders_select_owner
ON public.orders
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = orders.event_id
    AND e.created_by = auth.uid()
));

-- Insert orders only as the buyer (server-side preferred)
CREATE POLICY orders_insert_buyer
ON public.orders
FOR INSERT
WITH CHECK (buyer_id = auth.uid());

-- TICKETS
-- Owner can see their tickets
CREATE POLICY tickets_select_owner
ON public.tickets
FOR SELECT
USING (user_id = auth.uid());

-- Event owner can see tickets for their events
CREATE POLICY tickets_select_event_owner
ON public.tickets
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = tickets.event_id
    AND e.created_by = auth.uid()
));

-- Insert tickets only as the owner (if ever client-side; usually from RPC)
CREATE POLICY tickets_insert_owner
ON public.tickets
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- PASSES
-- Ticket owner can read their pass
CREATE POLICY passes_select_ticket_owner
ON public.passes
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = passes.ticket_id
    AND t.user_id = auth.uid()
));

-- Event owner can read passes for their event
CREATE POLICY passes_select_event_owner
ON public.passes
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.tickets t
    JOIN public.events e ON e.id = t.event_id
    WHERE t.id = passes.ticket_id
    AND e.created_by = auth.uid()
));

-- Block direct writes to passes (force through RPCs with SECURITY DEFINER)
REVOKE INSERT, UPDATE, DELETE ON public.passes FROM anon, authenticated;

-- CHECKINS
-- Only event owners can read checkins
CREATE POLICY checkins_select_event_owner
ON public.checkins
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.tickets t
    JOIN public.events e ON e.id = t.event_id
    WHERE t.id = checkins.ticket_id
    AND e.created_by = auth.uid()
));

-- Block direct writes to checkins (use process_checkin RPC)
REVOKE INSERT, UPDATE, DELETE ON public.checkins FROM anon, authenticated;

-- 5) Maintain search_tsv via trigger (so app never writes it)

-- Helper function: normalize text
CREATE OR REPLACE FUNCTION public._normalize_text(txt text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
    SELECT unaccent(COALESCE(txt,''));
$$;

-- Events search tsv from title + description + venue_name
CREATE OR REPLACE FUNCTION public.tg_events_tsvector()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_tsv :=
        to_tsvector('simple',
            public._normalize_text(COALESCE(NEW.title,'') || ' ' ||
                                  COALESCE(NEW.description,'') || ' ' ||
                                  COALESCE(NEW.venue_name,'')));
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_events_tsvector ON public.events;
CREATE TRIGGER trg_events_tsvector
BEFORE INSERT OR UPDATE OF title, description, venue_name
ON public.events
FOR EACH ROW EXECUTE FUNCTION public.tg_events_tsvector();

-- Communities search tsv from name + description
CREATE OR REPLACE FUNCTION public.tg_communities_tsvector()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_tsv :=
        to_tsvector('simple',
            public._normalize_text(COALESCE(NEW.name,'') || ' ' ||
                                  COALESCE(NEW.description,'')));
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_communities_tsvector ON public.communities;
CREATE TRIGGER trg_communities_tsvector
BEFORE INSERT OR UPDATE OF name, description
ON public.communities
FOR EACH ROW EXECUTE FUNCTION public.tg_communities_tsvector();

-- GIN indexes for tsvector columns
CREATE INDEX IF NOT EXISTS idx_events_search_tsv ON public.events USING gin (search_tsv);
CREATE INDEX IF NOT EXISTS idx_communities_search_tsv ON public.communities USING gin (search_tsv);

-- 6) Drop existing generated columns if they exist and recreate as trigger-maintained
DO $$
BEGIN
    -- Check if search_tsv is a generated column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'search_tsv' 
        AND generation_expression IS NOT NULL
    ) THEN
        ALTER TABLE public.events DROP COLUMN search_tsv;
        ALTER TABLE public.events ADD COLUMN search_tsv tsvector;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'communities' 
        AND column_name = 'search_tsv' 
        AND generation_expression IS NOT NULL
    ) THEN
        ALTER TABLE public.communities DROP COLUMN search_tsv;
        ALTER TABLE public.communities ADD COLUMN search_tsv tsvector;
    END IF;
END $$;

-- Now update existing data to populate search vectors
UPDATE public.events 
SET title = title
WHERE search_tsv IS NULL;

UPDATE public.communities 
SET name = name
WHERE search_tsv IS NULL;

-- 7) Comments for documentation (with existence checks)
DO $$
BEGIN
    -- Comment on functions if they exist
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = '_normalize_text') THEN
        COMMENT ON FUNCTION public._normalize_text(text) IS 'Normalizes text for search by removing accents';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'tg_events_tsvector') THEN
        COMMENT ON FUNCTION public.tg_events_tsvector() IS 'Automatically maintains search_tsv for events table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'tg_communities_tsvector') THEN
        COMMENT ON FUNCTION public.tg_communities_tsvector() IS 'Automatically maintains search_tsv for communities table';
    END IF;
    
    -- Comment on indexes if they exist
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_search_tsv') THEN
        COMMENT ON INDEX idx_events_search_tsv IS 'GIN index for full-text search on events';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_communities_search_tsv') THEN
        COMMENT ON INDEX idx_communities_search_tsv IS 'GIN index for full-text search on communities';
    END IF;
    
    -- Comment on policies if they exist
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'events_select_published' AND tablename = 'events') THEN
        COMMENT ON POLICY events_select_published ON public.events IS 'Public can view published events';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'orders_select_buyer' AND tablename = 'orders') THEN
        COMMENT ON POLICY orders_select_buyer ON public.orders IS 'Users can view their own orders';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'passes_select_ticket_owner' AND tablename = 'passes') THEN
        COMMENT ON POLICY passes_select_ticket_owner ON public.passes IS 'Ticket owners can view their passes';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'checkins_select_event_owner' AND tablename = 'checkins') THEN
        COMMENT ON POLICY checkins_select_event_owner ON public.checkins IS 'Event owners can view check-ins for their events';
    END IF;
END $$;