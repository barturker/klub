# Supabase Database Schema

## Overview

Complete database schema for klub using Supabase PostgreSQL with Row Level Security (RLS) policies.

## Core Principles

- **Row Level Security (RLS)** on all tables
- **UUID primary keys** for all tables
- **Soft deletes** using `deleted_at` timestamps
- **Automatic timestamps** with triggers
- **JSONB** for flexible metadata

## Database Setup

### 1. Enable Required Extensions

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Enable PostGIS for location data (optional)
CREATE EXTENSION IF NOT EXISTS "postgis";
```

### 2. Custom Types

```sql
-- User roles enum
CREATE TYPE user_role AS ENUM ('admin', 'organizer', 'member');

-- Community privacy levels
CREATE TYPE community_privacy AS ENUM ('public', 'private', 'invite_only');

-- Event types
CREATE TYPE event_type AS ENUM ('physical', 'virtual', 'hybrid');

-- Event status
CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');

-- Order status
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');

-- Membership status
CREATE TYPE membership_status AS ENUM ('active', 'cancelled', 'expired', 'paused');
```

## Core Tables

### Users & Profiles

```sql
-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    location TEXT,
    website TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view all profiles
CREATE POLICY "Profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Automatic profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
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

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Communities

```sql
-- Communities table
CREATE TABLE communities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    cover_url TEXT,
    category TEXT NOT NULL,
    privacy community_privacy DEFAULT 'public',
    organizer_id UUID REFERENCES profiles(id) NOT NULL,

    -- Settings and features
    settings JSONB DEFAULT '{}',
    features JSONB DEFAULT '{"events": true, "discussions": true, "memberships": true}',

    -- Stats (denormalized for performance)
    member_count INTEGER DEFAULT 0,
    event_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Indexes
    CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX idx_communities_slug ON communities(slug);
CREATE INDEX idx_communities_organizer ON communities(organizer_id);
CREATE INDEX idx_communities_category ON communities(category);

-- RLS Policies
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- Public communities viewable by all
CREATE POLICY "Public communities are viewable"
ON communities FOR SELECT
USING (privacy = 'public' OR auth.uid() IN (
    SELECT user_id FROM community_members WHERE community_id = communities.id
));

-- Only organizers can create
CREATE POLICY "Users can create communities"
ON communities FOR INSERT
WITH CHECK (auth.uid() = organizer_id);

-- Only organizers can update
CREATE POLICY "Organizers can update their communities"
ON communities FOR UPDATE
USING (auth.uid() = organizer_id);
```

### Community Members

```sql
-- Community members junction table
CREATE TABLE community_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role user_role DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',

    UNIQUE(community_id, user_id)
);

CREATE INDEX idx_members_community ON community_members(community_id);
CREATE INDEX idx_members_user ON community_members(user_id);

-- RLS Policies
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

-- Members can view other members
CREATE POLICY "Members can view community members"
ON community_members FOR SELECT
USING (
    auth.uid() IN (
        SELECT user_id FROM community_members cm
        WHERE cm.community_id = community_members.community_id
    )
);

-- Organizers can manage members
CREATE POLICY "Organizers can manage members"
ON community_members FOR ALL
USING (
    auth.uid() IN (
        SELECT organizer_id FROM communities
        WHERE id = community_members.community_id
    )
);
```

### Events

```sql
-- Events table
CREATE TABLE events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    organizer_id UUID REFERENCES profiles(id),

    -- Basic info
    title TEXT NOT NULL,
    description TEXT,
    type event_type NOT NULL,
    status event_status DEFAULT 'draft',

    -- Timing
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',

    -- Location (for physical/hybrid)
    venue_name TEXT,
    venue_address TEXT,
    venue_city TEXT,
    venue_country TEXT,
    venue_coordinates POINT,

    -- Virtual info
    virtual_url TEXT,
    virtual_platform TEXT,

    -- Capacity and pricing
    capacity INTEGER,
    attendee_count INTEGER DEFAULT 0,
    min_price INTEGER DEFAULT 0, -- in cents
    max_price INTEGER DEFAULT 0,

    -- Media and metadata
    cover_url TEXT,
    images TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_events_community ON events(community_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start ON events(start_at);
CREATE INDEX idx_events_search ON events USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- RLS Policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Published events are public
CREATE POLICY "Published events are viewable"
ON events FOR SELECT
USING (status = 'published' OR organizer_id = auth.uid());

-- Organizers can manage events
CREATE POLICY "Organizers can manage events"
ON events FOR ALL
USING (organizer_id = auth.uid() OR auth.uid() IN (
    SELECT organizer_id FROM communities WHERE id = events.community_id
));
```

### Tickets & Orders

```sql
-- Ticket tiers for events
CREATE TABLE ticket_tiers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- in cents
    capacity INTEGER,
    sold_count INTEGER DEFAULT 0,

    -- Sale window
    sales_start_at TIMESTAMPTZ,
    sales_end_at TIMESTAMPTZ,

    -- Benefits and metadata
    benefits TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    event_id UUID REFERENCES events(id),

    -- Payment info
    amount INTEGER NOT NULL, -- in cents
    currency TEXT DEFAULT 'USD',
    status order_status DEFAULT 'pending',
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,

    -- Order details
    items JSONB NOT NULL, -- Array of {ticket_tier_id, quantity, price}
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ
);

-- Tickets (actual tickets for attendees)
CREATE TABLE tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id),
    ticket_tier_id UUID REFERENCES ticket_tiers(id),
    user_id UUID REFERENCES profiles(id),

    -- Ticket info
    code TEXT UNIQUE NOT NULL, -- QR code value
    status TEXT DEFAULT 'valid', -- valid, used, cancelled

    -- Check-in
    checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES profiles(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_code ON tickets(code);
```

### Discussions & Posts

```sql
-- Discussion posts
CREATE TABLE posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id),

    -- Content
    title TEXT,
    content TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',

    -- Engagement stats (denormalized)
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,

    -- Status
    is_pinned BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Comments on posts
CREATE TABLE comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id),
    parent_id UUID REFERENCES comments(id), -- For nested comments

    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Likes (polymorphic)
CREATE TABLE likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- 'post', 'comment'
    entity_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, entity_type, entity_id)
);
```

## Realtime Subscriptions

```sql
-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE community_members;
```

## Helper Functions

```sql
-- Generate unique slug
CREATE OR REPLACE FUNCTION generate_unique_slug(name TEXT, table_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    base_slug := regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    final_slug := base_slug;

    WHILE EXISTS (
        SELECT 1 FROM communities WHERE slug = final_slug
    ) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;

    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON communities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ... repeat for other tables
```

## Storage Buckets

```sql
-- Create storage buckets via Supabase dashboard or CLI
-- Buckets needed:
-- 1. avatars (public)
-- 2. community-logos (public)
-- 3. event-covers (public)
-- 4. post-images (public)
-- 5. documents (private)
```

## Indexes for Performance

```sql
-- Full-text search
CREATE INDEX idx_communities_search ON communities
USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Frequently queried columns
CREATE INDEX idx_events_upcoming ON events(start_at)
WHERE status = 'published' AND start_at > NOW();

CREATE INDEX idx_posts_recent ON posts(created_at DESC)
WHERE deleted_at IS NULL;

-- Composite indexes for common queries
CREATE INDEX idx_members_role ON community_members(community_id, role);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

## Initial Seed Data

```sql
-- Insert sample categories
INSERT INTO communities (name, slug, description, category, organizer_id)
VALUES
    ('Tech Innovators', 'tech-innovators', 'Community for tech enthusiasts', 'technology', auth.uid()),
    ('Fitness Warriors', 'fitness-warriors', 'Get fit together', 'fitness', auth.uid());

-- More seed data as needed...
```

## Migration from Old Schema

```sql
-- If migrating from previous schema
-- 1. Export data from old database
-- 2. Transform to match new schema
-- 3. Import using Supabase CLI or dashboard
-- 4. Verify RLS policies
-- 5. Test all queries
```

## Backup Strategy

- **Automatic Daily Backups** (included in free tier)
- **Point-in-time Recovery** (Pro tier)
- **Manual exports** via Supabase CLI

## Performance Considerations

1. **Use indexes** for frequently queried columns
2. **Denormalize counts** for performance (member_count, like_count)
3. **Use JSONB** for flexible metadata
4. **Enable connection pooling** in Supabase dashboard
5. **Use materialized views** for complex analytics

## Security Best Practices

1. **Always use RLS** - Never disable it
2. **Validate in policies** - Don't trust client data
3. **Use service role key** only in server-side code
4. **Audit sensitive operations** - Log important changes
5. **Regular backups** - Test restore procedures
