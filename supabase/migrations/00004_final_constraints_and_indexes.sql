-- Migration: Final Constraints and Indexes
-- Description: Add remaining FKs, unique constraints, and performance indexes based on production best practices

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY CONSTRAINTS (if they don't already exist)
-- ============================================================================

DO $$ 
BEGIN
    -- events.created_by -> profiles.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'events_created_by_fk'
    ) THEN
        ALTER TABLE public.events
        ADD CONSTRAINT events_created_by_fk
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
    END IF;
    
    -- orders.buyer_id -> profiles.id  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_buyer_fk'
    ) THEN
        ALTER TABLE public.orders
        ADD CONSTRAINT orders_buyer_fk
        FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    
    -- checkins.scanned_by -> profiles.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'checkins_scanned_by_fk'
    ) THEN
        ALTER TABLE public.checkins
        ADD CONSTRAINT checkins_scanned_by_fk
        FOREIGN KEY (scanned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- 2. ADD UNIQUE CONSTRAINTS FOR DATA INTEGRITY
-- ============================================================================

DO $$ 
BEGIN
    -- One pass per ticket (critical for QR code uniqueness)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'passes_ticket_unique'
    ) THEN
        ALTER TABLE public.passes
        ADD CONSTRAINT passes_ticket_unique UNIQUE (ticket_id);
    END IF;
    
    -- Secure code must be globally unique
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_passes_secure_code_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_passes_secure_code_unique
        ON public.passes(secure_code);
    END IF;
    
    -- Case-insensitive unique slug for communities (already done in previous migration)
    -- Keeping for completeness
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_communities_slug_ci'
    ) THEN
        CREATE UNIQUE INDEX idx_communities_slug_ci
        ON public.communities(LOWER(slug));
    END IF;
    
    -- One successful check-in per ticket (prevent double entry)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_checkins_ticket_once'
    ) THEN
        CREATE UNIQUE INDEX idx_checkins_ticket_once
        ON public.checkins(ticket_id)
        WHERE result = 'success';
    END IF;
    
    -- Optional: One ticket per (event, user) - uncomment if business logic requires
    -- IF NOT EXISTS (
    --     SELECT 1 FROM pg_indexes 
    --     WHERE indexname = 'idx_tickets_event_user_unique'
    -- ) THEN
    --     CREATE UNIQUE INDEX idx_tickets_event_user_unique
    --     ON public.tickets(event_id, user_id);
    -- END IF;
END $$;

-- ============================================================================
-- 3. ADD COMPOSITE INDEXES FOR QUERY PERFORMANCE
-- ============================================================================

DO $$ 
BEGIN
    -- Hot path: listing events by community, status, and date
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_events_community_status_start'
    ) THEN
        CREATE INDEX idx_events_community_status_start
        ON public.events(community_id, status, start_at DESC);
    END IF;
    
    -- Hot path: finding tickets for an event by status
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_tickets_event_status'
    ) THEN
        CREATE INDEX idx_tickets_event_status
        ON public.tickets(event_id, status);
    END IF;
    
    -- Hot path: listing orders for an event
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_orders_event_status_created'
    ) THEN
        CREATE INDEX idx_orders_event_status_created
        ON public.orders(event_id, status, created_at DESC);
    END IF;
    
    -- Hot path: finding orders by buyer
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_orders_buyer_created'
    ) THEN
        CREATE INDEX idx_orders_buyer_created
        ON public.orders(buyer_id, created_at DESC)
        WHERE buyer_id IS NOT NULL;
    END IF;
    
    -- Hot path: checking membership status
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_community_members_user_community_role'
    ) THEN
        CREATE INDEX idx_community_members_user_community_role
        ON public.community_members(user_id, community_id, role);
    END IF;
    
    -- Hot path: finding passes by status
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_passes_status'
    ) THEN
        CREATE INDEX idx_passes_status
        ON public.passes(status)
        WHERE status = 'valid';
    END IF;
    
    -- Hot path: finding events by date range
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_events_start_end'
    ) THEN
        CREATE INDEX idx_events_start_end
        ON public.events(start_at, end_at)
        WHERE status = 'published';
    END IF;
END $$;

-- ============================================================================
-- 4. ENHANCED RLS POLICIES FOR SECURITY
-- ============================================================================

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Orders policies
DO $$ 
BEGIN
    -- Users can view their own orders
    DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
    CREATE POLICY "Users can view own orders"
    ON public.orders FOR SELECT
    USING (buyer_id = auth.uid());
    
    -- Event organizers can view orders for their events
    DROP POLICY IF EXISTS "Organizers can view event orders" ON public.orders;
    CREATE POLICY "Organizers can view event orders"
    ON public.orders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.communities c ON e.community_id = c.id
            WHERE e.id = orders.event_id
            AND (
                c.organizer_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.community_members cm
                    WHERE cm.community_id = c.id
                    AND cm.user_id = auth.uid()
                    AND cm.role IN ('admin', 'moderator')
                )
            )
        )
    );
END $$;

-- Passes policies
DO $$ 
BEGIN
    -- Users can view their own passes
    DROP POLICY IF EXISTS "Users can view own passes" ON public.passes;
    CREATE POLICY "Users can view own passes"
    ON public.passes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets t
            WHERE t.id = passes.ticket_id
            AND t.user_id = auth.uid()
        )
    );
    
    -- Event staff can view/manage passes for their events
    DROP POLICY IF EXISTS "Event staff can manage passes" ON public.passes;
    CREATE POLICY "Event staff can manage passes"
    ON public.passes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets t
            JOIN public.events e ON t.event_id = e.id
            JOIN public.communities c ON e.community_id = c.id
            WHERE t.id = passes.ticket_id
            AND (
                c.organizer_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.community_members cm
                    WHERE cm.community_id = c.id
                    AND cm.user_id = auth.uid()
                    AND cm.role IN ('admin', 'moderator')
                )
            )
        )
    );
END $$;

-- Checkins policies
DO $$ 
BEGIN
    -- Event staff can create/view checkins
    DROP POLICY IF EXISTS "Event staff can manage checkins" ON public.checkins;
    CREATE POLICY "Event staff can manage checkins"
    ON public.checkins FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets t
            JOIN public.events e ON t.event_id = e.id
            JOIN public.communities c ON e.community_id = c.id
            WHERE t.id = checkins.ticket_id
            AND (
                c.organizer_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.community_members cm
                    WHERE cm.community_id = c.id
                    AND cm.user_id = auth.uid()
                    AND cm.role IN ('admin', 'moderator')
                )
            )
        )
    );
END $$;

-- Events visibility policy update
DO $$ 
BEGIN
    -- Public can see published events, organizers can see all their events
    DROP POLICY IF EXISTS "Events visibility policy" ON public.events;
    CREATE POLICY "Events visibility policy"
    ON public.events FOR SELECT
    USING (
        status = 'published'
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.communities c
            WHERE c.id = events.community_id
            AND (
                c.organizer_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.community_members cm
                    WHERE cm.community_id = c.id
                    AND cm.user_id = auth.uid()
                    AND cm.role IN ('admin', 'moderator')
                )
            )
        )
    );
END $$;

-- ============================================================================
-- 5. ADD TRIGGERS FOR SEARCH VECTOR UPDATES
-- ============================================================================

-- Function to update search_tsv for communities
CREATE OR REPLACE FUNCTION update_community_search_tsv()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_tsv := to_tsvector('english', 
        COALESCE(NEW.name, '') || ' ' || 
        COALESCE(NEW.description, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for communities search vector
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_community_search_tsv_trigger'
    ) THEN
        CREATE TRIGGER update_community_search_tsv_trigger
        BEFORE INSERT OR UPDATE OF name, description
        ON public.communities
        FOR EACH ROW
        EXECUTE FUNCTION update_community_search_tsv();
    END IF;
END $$;

-- Function to update search_tsv for events
CREATE OR REPLACE FUNCTION update_event_search_tsv()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_tsv := to_tsvector('english', 
        COALESCE(NEW.title, '') || ' ' || 
        COALESCE(NEW.description, '') || ' ' || 
        COALESCE(NEW.venue_name, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for events search vector
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_event_search_tsv_trigger'
    ) THEN
        CREATE TRIGGER update_event_search_tsv_trigger
        BEFORE INSERT OR UPDATE OF title, description, venue_name
        ON public.events
        FOR EACH ROW
        EXECUTE FUNCTION update_event_search_tsv();
    END IF;
END $$;

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON CONSTRAINT passes_ticket_unique ON public.passes IS 'Ensures one pass per ticket for QR code uniqueness';
COMMENT ON INDEX idx_passes_secure_code_unique IS 'Ensures globally unique secure codes for passes';
COMMENT ON INDEX idx_checkins_ticket_once IS 'Prevents multiple successful check-ins for the same ticket';
COMMENT ON INDEX idx_events_community_status_start IS 'Optimizes event listing queries by community and status';
COMMENT ON INDEX idx_tickets_event_status IS 'Optimizes ticket queries by event and status';
COMMENT ON INDEX idx_orders_event_status_created IS 'Optimizes order listing for events';

-- ============================================================================
-- 7. VALIDATE CONSTRAINTS AND DATA INTEGRITY
-- ============================================================================

DO $$ 
DECLARE
    duplicate_passes INTEGER;
    duplicate_secure_codes INTEGER;
BEGIN
    -- Check for duplicate passes per ticket
    SELECT COUNT(*) INTO duplicate_passes
    FROM (
        SELECT ticket_id, COUNT(*) as cnt
        FROM public.passes
        GROUP BY ticket_id
        HAVING COUNT(*) > 1
    ) dupes;
    
    IF duplicate_passes > 0 THEN
        RAISE WARNING 'Found % tickets with multiple passes - manual cleanup needed', duplicate_passes;
    END IF;
    
    -- Check for duplicate secure codes
    SELECT COUNT(*) INTO duplicate_secure_codes
    FROM (
        SELECT secure_code, COUNT(*) as cnt
        FROM public.passes
        GROUP BY secure_code
        HAVING COUNT(*) > 1
    ) dupes;
    
    IF duplicate_secure_codes > 0 THEN
        RAISE WARNING 'Found % duplicate secure codes - manual cleanup needed', duplicate_secure_codes;
    END IF;
END $$;