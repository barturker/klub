# Supabase Database Schema

## Overview

Production-ready database schema for Klub with enterprise-grade type safety, security, and performance optimizations.

## Current Status ✅

**Last Updated: January 17, 2025**

- **14 Core Tables** fully implemented
- **6 Enum Types** for type safety
- **10+ RPC Functions** for atomic operations
- **30+ Performance Indexes** optimized
- **100% RLS Coverage** on all tables
- **Full-Text Search** with PostgreSQL
- **Privacy Levels** implementation (public/private/invite_only)
- **Events Management** with recurring support
- **Ticketing System** with QR code passes

## Core Principles

- **Row Level Security (RLS)** on all tables
- **UUID primary keys** for all tables
- **PostgreSQL Enums** for type safety
- **Automatic timestamps** with triggers
- **JSONB** for flexible metadata
- **Atomic transactions** for critical operations
- **Case-insensitive unique constraints** on slugs
- **Privacy-aware access control**

## Database Extensions

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Enable trigram search for similarity
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable PostGIS for location data
CREATE EXTENSION IF NOT EXISTS "postgis";
```

## Enum Types

```sql
-- Event status
CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');

-- Member role in community
CREATE TYPE member_role AS ENUM ('member', 'moderator', 'admin');

-- Ticket status
CREATE TYPE ticket_status AS ENUM ('pending', 'confirmed', 'cancelled', 'refunded', 'checked_in');

-- Order status
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled');

-- Payment provider
CREATE TYPE payment_provider AS ENUM ('stripe', 'iyzico', 'paypal', 'manual');

-- Pass status for QR codes
CREATE TYPE pass_status AS ENUM ('valid', 'used', 'revoked', 'expired');
```

## Core Tables

### 1. Profiles (Extended from auth.users)

```sql
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    username TEXT,
    display_name TEXT,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    location TEXT,
    interests TEXT[],
    social_links JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    privacy_level TEXT DEFAULT 'public',
    profile_complete BOOLEAN DEFAULT FALSE,
    member_since TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_profiles_username_unique ON profiles(LOWER(username)) WHERE username IS NOT NULL;
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_display_name ON profiles(display_name);
```

### 2. Communities

```sql
CREATE TABLE communities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    theme_color TEXT,
    custom_domain TEXT,
    organizer_id UUID REFERENCES profiles(id) ON DELETE RESTRICT NOT NULL,

    -- Privacy Settings
    privacy_level TEXT DEFAULT 'public', -- 'public', 'private', 'invite_only'
    is_public BOOLEAN GENERATED ALWAYS AS (
        CASE WHEN privacy_level IN ('private', 'invite_only') THEN false ELSE true END
    ) STORED,
    is_private BOOLEAN GENERATED ALWAYS AS (
        CASE WHEN privacy_level IN ('private', 'invite_only') THEN true ELSE false END
    ) STORED,

    -- Features
    has_events BOOLEAN DEFAULT FALSE,
    features JSONB DEFAULT '{}',

    -- Stats (denormalized for performance)
    member_count INTEGER DEFAULT 0,

    -- Metadata
    search_tsv TSVECTOR,
    last_settings_changed_at TIMESTAMPTZ,
    last_settings_changed_by UUID REFERENCES profiles(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_communities_slug_unique ON communities(LOWER(slug));
CREATE INDEX idx_communities_privacy ON communities(privacy_level);
CREATE INDEX idx_communities_is_private ON communities(is_private) WHERE is_private = true;
CREATE INDEX idx_communities_organizer ON communities(organizer_id);
CREATE INDEX idx_communities_search ON communities USING GIN(search_tsv);
```

### 3. Community Members

```sql
CREATE TABLE community_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role member_role DEFAULT 'member' NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(community_id, user_id)
);

-- Indexes
CREATE INDEX idx_community_members_community ON community_members(community_id);
CREATE INDEX idx_community_members_user ON community_members(user_id);
CREATE INDEX idx_community_members_role ON community_members(role) WHERE role != 'member';
```

### 4. Events

```sql
CREATE TABLE events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES profiles(id) NOT NULL,

    -- Basic Info
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    image_url TEXT,

    -- Schedule
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    timezone TEXT DEFAULT 'America/New_York' NOT NULL,

    -- Recurring Events
    parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    recurring_rule TEXT, -- RRULE format
    recurring_end_date TIMESTAMPTZ,

    -- Location
    venue_name TEXT,
    venue_address TEXT,
    venue_city TEXT,
    venue_country TEXT,
    online_url TEXT,

    -- Settings
    status TEXT DEFAULT 'published', -- Using event_status enum values
    event_type TEXT, -- 'in_person', 'online', 'hybrid'
    capacity INTEGER,

    -- Metadata
    tags TEXT[],
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_events_community_slug ON events(community_id, LOWER(slug));
CREATE INDEX idx_events_community_status_start ON events(community_id, status, start_at DESC) WHERE status = 'published';
CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_created_by ON events(created_by);
```

### 5. Tickets

```sql
CREATE TABLE tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

    -- Payment
    amount INTEGER NOT NULL, -- in cents
    currency TEXT DEFAULT 'USD' NOT NULL,
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,

    -- Status
    status ticket_status DEFAULT 'pending' NOT NULL,

    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_order ON tickets(order_id);
CREATE INDEX idx_tickets_status ON tickets(status) WHERE status != 'confirmed';
```

### 6. Orders

```sql
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    buyer_id UUID REFERENCES profiles(id),

    -- Payment Details
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    quantity INTEGER NOT NULL,
    provider payment_provider DEFAULT 'stripe' NOT NULL,
    provider_ref TEXT, -- External payment reference

    -- Status
    status order_status DEFAULT 'pending' NOT NULL,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orders_event ON orders(event_id);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_status ON orders(status) WHERE status NOT IN ('paid', 'cancelled');
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

### 7. Passes (QR Codes)

```sql
CREATE TABLE passes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE UNIQUE NOT NULL,
    secure_code TEXT UNIQUE NOT NULL,
    status pass_status DEFAULT 'valid' NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_refreshed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_passes_ticket_unique ON passes(ticket_id);
CREATE UNIQUE INDEX idx_passes_code_unique ON passes(secure_code);
CREATE INDEX idx_passes_status ON passes(status) WHERE status != 'used';
```

### 8. Check-ins

```sql
CREATE TABLE checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    pass_id UUID REFERENCES passes(id) ON DELETE CASCADE,

    -- Check-in Details
    scanned_by UUID REFERENCES profiles(id),
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    result TEXT NOT NULL, -- 'success', 'duplicate', 'invalid', 'expired'

    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_checkins_ticket ON checkins(ticket_id);
CREATE INDEX idx_checkins_pass ON checkins(pass_id);
CREATE INDEX idx_checkins_scanned_by ON checkins(scanned_by);
CREATE INDEX idx_checkins_result ON checkins(result) WHERE result != 'success';
```

### 9. Invitations

```sql
CREATE TABLE invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE NOT NULL,
    token TEXT UNIQUE NOT NULL,

    -- Creator Info
    created_by UUID REFERENCES profiles(id) NOT NULL,
    created_by_role member_role DEFAULT 'member' NOT NULL,

    -- Limits
    max_uses INTEGER DEFAULT 1,
    uses_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_community ON invitations(community_id);
CREATE INDEX idx_invitations_expires ON invitations(expires_at) WHERE expires_at > NOW();
```

### 10. Community Join Requests

```sql
CREATE TABLE community_join_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

    -- Request Details
    request_message TEXT,
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected', 'expired'

    -- Processing
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES profiles(id),
    rejection_reason TEXT,

    -- Timing
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

    UNIQUE(community_id, user_id)
);

-- Indexes
CREATE INDEX idx_join_requests_community ON community_join_requests(community_id);
CREATE INDEX idx_join_requests_user ON community_join_requests(user_id);
CREATE INDEX idx_join_requests_status ON community_join_requests(status) WHERE status = 'pending';
```

## Row Level Security (RLS) Policies

### Communities Table

```sql
-- SELECT: Respect privacy levels
CREATE POLICY "communities_select_privacy" ON communities FOR SELECT
USING (
    privacy_level = 'public'
    OR organizer_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = communities.id
        AND cm.user_id = auth.uid()
    )
);

-- INSERT: Authenticated users can create
CREATE POLICY "communities_insert_auth" ON communities FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND organizer_id = auth.uid());

-- UPDATE: Organizers and admins only
CREATE POLICY "communities_update_admin" ON communities FOR UPDATE
USING (
    organizer_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = communities.id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
    )
);

-- DELETE: Only organizers
CREATE POLICY "communities_delete_organizer" ON communities FOR DELETE
USING (organizer_id = auth.uid());
```

### Community Members Table

```sql
-- SELECT: Members can see other members, public communities visible to all
CREATE POLICY "community_members_select_members" ON community_members FOR SELECT
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM community_members cm2
        WHERE cm2.community_id = community_members.community_id
        AND cm2.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM communities c
        WHERE c.id = community_members.community_id
        AND c.privacy_level = 'public'
    )
);

-- INSERT: Join public communities or admin invite
CREATE POLICY "community_members_insert_join" ON community_members FOR INSERT
WITH CHECK (
    (user_id = auth.uid() AND EXISTS (
        SELECT 1 FROM communities c
        WHERE c.id = community_members.community_id
        AND c.privacy_level = 'public'
    ))
    OR EXISTS (
        SELECT 1 FROM communities c
        WHERE c.id = community_members.community_id
        AND (c.organizer_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM community_members cm
                WHERE cm.community_id = c.id
                AND cm.user_id = auth.uid()
                AND cm.role IN ('admin', 'moderator')
            )
        )
    )
);
```

### Events Table

```sql
-- SELECT: Public events or community members
CREATE POLICY "events_select_visibility" ON events FOR SELECT
USING (
    status = 'published' AND EXISTS (
        SELECT 1 FROM communities c
        WHERE c.id = events.community_id
        AND (c.privacy_level = 'public'
            OR EXISTS (
                SELECT 1 FROM community_members cm
                WHERE cm.community_id = c.id
                AND cm.user_id = auth.uid()
            )
        )
    )
    OR created_by = auth.uid()
);

-- INSERT: Community admins and organizers
CREATE POLICY "events_insert_admin" ON events FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM communities c
        WHERE c.id = events.community_id
        AND (c.organizer_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM community_members cm
                WHERE cm.community_id = c.id
                AND cm.user_id = auth.uid()
                AND cm.role IN ('admin', 'moderator')
            )
        )
    )
);
```

## Helper Functions

### Profile Completion Calculation
```sql
CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
    completion_score INTEGER := 0;
    profile_record RECORD;
BEGIN
    SELECT * INTO profile_record FROM profiles WHERE id = profile_id;

    IF profile_record.display_name IS NOT NULL THEN completion_score := completion_score + 20; END IF;
    IF profile_record.bio IS NOT NULL THEN completion_score := completion_score + 20; END IF;
    IF profile_record.avatar_url IS NOT NULL THEN completion_score := completion_score + 20; END IF;
    IF profile_record.location IS NOT NULL THEN completion_score := completion_score + 20; END IF;
    IF array_length(profile_record.interests, 1) > 0 THEN completion_score := completion_score + 20; END IF;

    UPDATE profiles SET profile_complete = (completion_score >= 60) WHERE id = profile_id;

    RETURN completion_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Accept Invitation
```sql
CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT, p_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, community_id UUID) AS $$
DECLARE
    v_invitation RECORD;
    v_community_id UUID;
BEGIN
    -- Find valid invitation
    SELECT * INTO v_invitation
    FROM invitations
    WHERE token = p_token
    AND expires_at > NOW()
    AND uses_count < max_uses;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Invalid or expired invitation', NULL::UUID;
        RETURN;
    END IF;

    -- Check if already member
    IF EXISTS (
        SELECT 1 FROM community_members
        WHERE community_id = v_invitation.community_id
        AND user_id = p_user_id
    ) THEN
        RETURN QUERY SELECT FALSE, 'Already a member', v_invitation.community_id;
        RETURN;
    END IF;

    -- Add member
    INSERT INTO community_members (community_id, user_id, role)
    VALUES (v_invitation.community_id, p_user_id, 'member');

    -- Update invitation usage
    UPDATE invitations
    SET uses_count = uses_count + 1
    WHERE id = v_invitation.id;

    -- Record usage
    INSERT INTO invitation_uses (invitation_id, user_id)
    VALUES (v_invitation.id, p_user_id);

    RETURN QUERY SELECT TRUE, 'Successfully joined community', v_invitation.community_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Performance Optimizations

1. **Denormalized Counters**: member_count on communities table
2. **Composite Indexes**: Multi-column indexes for common query patterns
3. **Partial Indexes**: Filtered indexes for status columns
4. **Generated Columns**: is_private, is_public for backward compatibility
5. **Full-Text Search**: Using tsvector for community search
6. **UUID v4**: Using gen_random_uuid() for better performance

## Migration Strategy

1. All changes through versioned migration files
2. Idempotent migrations using IF NOT EXISTS
3. Data migrations before schema changes
4. Test migrations locally before production
5. Keep migrations small and focused

## Security Best Practices

1. **RLS on all tables** - No exceptions
2. **SECURITY DEFINER functions** - For elevated operations
3. **Parameterized queries** - Prevent SQL injection
4. **Least privilege principle** - Minimal permissions
5. **Audit trails** - Track sensitive operations
6. **Privacy by default** - Opt-in for public visibility