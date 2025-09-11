-- Complete Database Schema Migration
-- This migration creates all tables, enums, and functions as defined in database.types.ts

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create custom types/enums (if they don't exist)
DO $$ BEGIN
    CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('pending', 'confirmed', 'cancelled', 'refunded', 'checked_in');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE member_role AS ENUM ('member', 'moderator', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop existing tables if they exist (be careful in production!)
DROP TABLE IF EXISTS checkins CASCADE;
DROP TABLE IF EXISTS passes CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS community_members CASCADE;
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Communities table
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    avatar_url TEXT,
    cover_image_url TEXT,
    organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT true NOT NULL,
    member_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    search_tsv tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED
);

-- Community members junction table
CREATE TABLE community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role member_role DEFAULT 'member' NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(community_id, user_id)
);

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    venue_name TEXT,
    venue_address TEXT,
    venue_lat NUMERIC(10, 7),
    venue_lng NUMERIC(10, 7),
    venue_geo geography(Point, 4326) GENERATED ALWAYS AS (
        CASE 
            WHEN venue_lat IS NOT NULL AND venue_lng IS NOT NULL 
            THEN ST_SetSRID(ST_MakePoint(venue_lng, venue_lat), 4326)::geography
            ELSE NULL
        END
    ) STORED,
    is_online BOOLEAN DEFAULT false NOT NULL,
    online_url TEXT,
    capacity INTEGER,
    tickets_sold INTEGER DEFAULT 0 NOT NULL,
    price NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    status event_status DEFAULT 'draft' NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    search_tsv tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(venue_name, '')), 'C')
    ) STORED,
    UNIQUE(community_id, slug),
    CONSTRAINT valid_event_dates CHECK (end_at >= start_at),
    CONSTRAINT valid_capacity CHECK (capacity IS NULL OR capacity > 0),
    CONSTRAINT valid_tickets_sold CHECK (tickets_sold >= 0),
    CONSTRAINT valid_price CHECK (price >= 0)
);

-- Orders table (for payment tracking)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    currency TEXT DEFAULT 'USD' NOT NULL,
    provider TEXT CHECK (provider IN ('stripe', 'iyzico', 'paypal')),
    provider_ref TEXT,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'paid', 'refunded', 'failed')),
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tickets table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    status ticket_status DEFAULT 'pending' NOT NULL,
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    qr_code TEXT,
    purchased_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Passes table (for secure check-in)
CREATE TABLE passes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    secure_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'valid' NOT NULL CHECK (status IN ('valid', 'used', 'revoked')),
    last_refreshed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Check-ins audit table
CREATE TABLE checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    pass_id UUID REFERENCES passes(id) ON DELETE SET NULL,
    scanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    scanned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('ok', 'already_used', 'revoked', 'invalid')),
    metadata JSONB DEFAULT '{}' NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_communities_slug ON communities(slug);
CREATE INDEX idx_communities_organizer ON communities(organizer_id);
CREATE INDEX idx_communities_search ON communities USING GIN(search_tsv);

CREATE INDEX idx_community_members_community ON community_members(community_id);
CREATE INDEX idx_community_members_user ON community_members(user_id);

CREATE INDEX idx_events_community ON events(community_id);
CREATE INDEX idx_events_slug ON events(community_id, slug);
CREATE INDEX idx_events_dates ON events(start_at, end_at);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_search ON events USING GIN(search_tsv);
-- PostGIS spatial index for venue locations
CREATE INDEX idx_events_geo ON events USING GIST(venue_geo) WHERE venue_geo IS NOT NULL;

CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_event ON orders(event_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_order ON tickets(order_id);
CREATE INDEX idx_tickets_status ON tickets(status);

CREATE INDEX idx_passes_ticket ON passes(ticket_id);
CREATE INDEX idx_passes_secure_code ON passes(secure_code);
CREATE INDEX idx_passes_status ON passes(status);

CREATE INDEX idx_checkins_ticket ON checkins(ticket_id);
CREATE INDEX idx_checkins_pass ON checkins(pass_id);
CREATE INDEX idx_checkins_scanned_at ON checkins(scanned_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON communities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle profile creation on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to purchase ticket (atomic operation)
CREATE OR REPLACE FUNCTION purchase_ticket(
    p_event_id UUID,
    p_user_id UUID,
    p_amount NUMERIC,
    p_currency TEXT DEFAULT 'USD'
)
RETURNS UUID AS $$
DECLARE
    v_ticket_id UUID;
    v_available_capacity INTEGER;
BEGIN
    -- Lock the event row for update
    SELECT capacity - tickets_sold INTO v_available_capacity
    FROM events
    WHERE id = p_event_id
    FOR UPDATE;
    
    -- Check if tickets are available
    IF v_available_capacity IS NOT NULL AND v_available_capacity <= 0 THEN
        RAISE EXCEPTION 'No tickets available for this event';
    END IF;
    
    -- Create the ticket
    INSERT INTO tickets (event_id, user_id, amount, currency, status)
    VALUES (p_event_id, p_user_id, p_amount, p_currency, 'pending')
    RETURNING id INTO v_ticket_id;
    
    -- Update tickets_sold counter
    UPDATE events
    SET tickets_sold = tickets_sold + 1
    WHERE id = p_event_id;
    
    RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate pass for ticket
CREATE OR REPLACE FUNCTION generate_pass_for_ticket(p_ticket_id UUID)
RETURNS UUID AS $$
DECLARE
    v_pass_id UUID;
    v_secure_code TEXT;
BEGIN
    -- Generate a secure random code
    v_secure_code := encode(gen_random_bytes(32), 'hex');
    
    -- Create the pass
    INSERT INTO passes (ticket_id, secure_code, status)
    VALUES (p_ticket_id, v_secure_code, 'valid')
    RETURNING id INTO v_pass_id;
    
    RETURN v_pass_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process check-in
CREATE OR REPLACE FUNCTION process_checkin(
    p_secure_code TEXT,
    p_scanned_by UUID
)
RETURNS JSONB AS $$
DECLARE
    v_pass_record RECORD;
    v_ticket_record RECORD;
    v_checkin_id UUID;
    v_result TEXT;
BEGIN
    -- Find the pass
    SELECT p.*, t.event_id, t.user_id
    INTO v_pass_record
    FROM passes p
    JOIN tickets t ON p.ticket_id = t.id
    WHERE p.secure_code = p_secure_code
    FOR UPDATE;
    
    IF NOT FOUND THEN
        -- Invalid pass
        v_result := 'invalid';
        
        -- Log the attempt
        INSERT INTO checkins (ticket_id, scanned_by, result, metadata)
        VALUES (NULL, p_scanned_by, v_result, jsonb_build_object('secure_code', p_secure_code))
        RETURNING id INTO v_checkin_id;
        
        RETURN jsonb_build_object(
            'success', false,
            'result', v_result,
            'message', 'Invalid pass code'
        );
    END IF;
    
    -- Check pass status
    IF v_pass_record.status = 'used' THEN
        v_result := 'already_used';
    ELSIF v_pass_record.status = 'revoked' THEN
        v_result := 'revoked';
    ELSE
        v_result := 'ok';
        -- Mark pass as used
        UPDATE passes SET status = 'used' WHERE id = v_pass_record.id;
        -- Update ticket status
        UPDATE tickets SET status = 'checked_in' WHERE id = v_pass_record.ticket_id;
    END IF;
    
    -- Log the check-in
    INSERT INTO checkins (ticket_id, pass_id, scanned_by, result)
    VALUES (v_pass_record.ticket_id, v_pass_record.id, p_scanned_by, v_result)
    RETURNING id INTO v_checkin_id;
    
    RETURN jsonb_build_object(
        'success', v_result = 'ok',
        'result', v_result,
        'ticket_id', v_pass_record.ticket_id,
        'event_id', v_pass_record.event_id,
        'checkin_id', v_checkin_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get event statistics
CREATE OR REPLACE FUNCTION get_event_stats(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_tickets', COUNT(*),
        'confirmed_tickets', COUNT(*) FILTER (WHERE status = 'confirmed'),
        'checked_in', COUNT(*) FILTER (WHERE status = 'checked_in'),
        'revenue', SUM(amount) FILTER (WHERE status IN ('confirmed', 'checked_in'))
    ) INTO v_stats
    FROM tickets
    WHERE event_id = p_event_id;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- RLS Policies for communities
CREATE POLICY "Public communities are viewable by everyone"
    ON communities FOR SELECT
    USING (is_public = true);

CREATE POLICY "Private communities viewable by members"
    ON communities FOR SELECT
    USING (
        is_public = false AND 
        EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = communities.id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Organizers can update their communities"
    ON communities FOR UPDATE
    USING (organizer_id = auth.uid());

CREATE POLICY "Authenticated users can create communities"
    ON communities FOR INSERT
    WITH CHECK (auth.uid() = organizer_id);

-- RLS Policies for community_members
CREATE POLICY "Members list viewable by community members"
    ON community_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM community_members cm
            WHERE cm.community_id = community_members.community_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage members"
    ON community_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM community_members cm
            WHERE cm.community_id = community_members.community_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('admin', 'moderator')
        )
    );

-- RLS Policies for events
CREATE POLICY "Public events are viewable by everyone"
    ON events FOR SELECT
    USING (
        status = 'published' AND
        EXISTS (
            SELECT 1 FROM communities c
            WHERE c.id = events.community_id
            AND c.is_public = true
        )
    );

CREATE POLICY "Community members can view all community events"
    ON events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM community_members
            WHERE community_id = events.community_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Event creators and community admins can manage events"
    ON events FOR ALL
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM community_members
            WHERE community_id = events.community_id
            AND user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- RLS Policies for orders
CREATE POLICY "Users can view own orders"
    ON orders FOR SELECT
    USING (buyer_id = auth.uid());

CREATE POLICY "Users can create own orders"
    ON orders FOR INSERT
    WITH CHECK (buyer_id = auth.uid());

-- RLS Policies for tickets
CREATE POLICY "Users can view own tickets"
    ON tickets FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Event organizers can view event tickets"
    ON tickets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = tickets.event_id
            AND (e.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM community_members cm
                    WHERE cm.community_id = e.community_id
                    AND cm.user_id = auth.uid()
                    AND cm.role IN ('admin', 'moderator')
                )
            )
        )
    );

-- RLS Policies for passes
CREATE POLICY "Users can view own passes"
    ON passes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = passes.ticket_id
            AND t.user_id = auth.uid()
        )
    );

-- RLS Policies for checkins
CREATE POLICY "Event organizers can view checkins"
    ON checkins FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            JOIN events e ON t.event_id = e.id
            WHERE t.id = checkins.ticket_id
            AND (e.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM community_members cm
                    WHERE cm.community_id = e.community_id
                    AND cm.user_id = auth.uid()
                    AND cm.role IN ('admin', 'moderator')
                )
            )
        )
    );

CREATE POLICY "Event organizers can create checkins"
    ON checkins FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tickets t
            JOIN events e ON t.event_id = e.id
            WHERE t.id = checkins.ticket_id
            AND (e.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM community_members cm
                    WHERE cm.community_id = e.community_id
                    AND cm.user_id = auth.uid()
                    AND cm.role IN ('admin', 'moderator')
                )
            )
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;