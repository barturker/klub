-- Migration: Schema Improvements based on best practices
-- Description: Add missing FKs, convert strings to enums, remove deprecated fields, add case-insensitive indexes

-- 1. Create new enum types
DO $$ 
BEGIN
    -- Order status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled');
    END IF;
    
    -- Payment provider enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider') THEN
        CREATE TYPE payment_provider AS ENUM ('stripe', 'iyzico', 'paypal', 'manual');
    END IF;
    
    -- Pass status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pass_status') THEN
        CREATE TYPE pass_status AS ENUM ('valid', 'used', 'revoked', 'expired');
    END IF;
END $$;

-- 2. Add missing foreign key columns if they don't exist
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS created_by UUID;

-- 3. Migrate existing data and update column types

-- For orders table
DO $$ 
BEGIN
    -- Convert status column to enum (only if it's still text type)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'status' 
        AND data_type = 'text'
    ) THEN
        -- First, ensure we have default values for existing rows (before conversion)
        UPDATE orders 
        SET status = 'pending' 
        WHERE status IS NULL OR status = '' OR status NOT IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled');
        
        UPDATE orders 
        SET provider = 'stripe' 
        WHERE provider IS NULL OR provider = '' OR provider NOT IN ('stripe', 'iyzico', 'paypal', 'manual');
        -- Create temporary column
        ALTER TABLE orders ADD COLUMN status_new order_status;
        
        -- Migrate data with safe casting
        UPDATE orders SET status_new = 
            CASE 
                WHEN status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled') 
                THEN status::order_status
                ELSE 'pending'::order_status
            END;
        
        -- Drop old column and rename new
        ALTER TABLE orders DROP COLUMN status;
        ALTER TABLE orders RENAME COLUMN status_new TO status;
        ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
        ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending'::order_status;
    END IF;
    
    -- Convert provider column to enum
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'provider' 
        AND data_type = 'text'
    ) THEN
        -- Create temporary column
        ALTER TABLE orders ADD COLUMN provider_new payment_provider;
        
        -- Migrate data with safe casting
        UPDATE orders SET provider_new = 
            CASE 
                WHEN provider IN ('stripe', 'iyzico', 'paypal', 'manual') 
                THEN provider::payment_provider
                ELSE 'stripe'::payment_provider
            END;
        
        -- Drop old column and rename new
        ALTER TABLE orders DROP COLUMN provider;
        ALTER TABLE orders RENAME COLUMN provider_new TO provider;
        ALTER TABLE orders ALTER COLUMN provider SET NOT NULL;
        ALTER TABLE orders ALTER COLUMN provider SET DEFAULT 'stripe'::payment_provider;
    END IF;
END $$;

-- For passes table
DO $$ 
BEGIN
    -- Convert status column to enum (only if it's still text type)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'passes' 
        AND column_name = 'status' 
        AND data_type = 'text'
    ) THEN
        -- Set default values for existing rows (before conversion)
        UPDATE passes 
        SET status = 'valid' 
        WHERE status IS NULL OR status = '' OR status NOT IN ('valid', 'used', 'revoked', 'expired');
        -- Create temporary column
        ALTER TABLE passes ADD COLUMN status_new pass_status;
        
        -- Migrate data with safe casting
        UPDATE passes SET status_new = 
            CASE 
                WHEN status IN ('valid', 'used', 'revoked', 'expired') 
                THEN status::pass_status
                ELSE 'valid'::pass_status
            END;
        
        -- Drop old column and rename new
        ALTER TABLE passes DROP COLUMN status;
        ALTER TABLE passes RENAME COLUMN status_new TO status;
        ALTER TABLE passes ALTER COLUMN status SET NOT NULL;
        ALTER TABLE passes ALTER COLUMN status SET DEFAULT 'valid'::pass_status;
    END IF;
END $$;

-- 4. Add foreign key constraints
DO $$ 
BEGIN
    -- events.created_by -> profiles.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'events_created_by_fkey'
    ) THEN
        -- First set created_by to organizer_id for existing events (reasonable default)
        UPDATE events e
        SET created_by = c.organizer_id
        FROM communities c
        WHERE e.community_id = c.id
        AND e.created_by IS NULL;
        
        ALTER TABLE events 
        ADD CONSTRAINT events_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
    
    -- orders.buyer_id -> profiles.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_buyer_id_fkey'
    ) THEN
        ALTER TABLE orders 
        ADD CONSTRAINT orders_buyer_id_fkey 
        FOREIGN KEY (buyer_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- checkins.scanned_by -> profiles.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'checkins_scanned_by_fkey'
    ) THEN
        ALTER TABLE checkins 
        ADD CONSTRAINT checkins_scanned_by_fkey 
        FOREIGN KEY (scanned_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Remove deprecated fields
ALTER TABLE tickets DROP COLUMN IF EXISTS qr_code;

-- 6. Add case-insensitive unique indexes
DO $$ 
BEGIN
    -- For profiles.username
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'profiles_username_lower_unique'
    ) THEN
        -- First drop the existing unique constraint if it exists
        ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_username_key;
        
        -- Create case-insensitive unique index
        CREATE UNIQUE INDEX profiles_username_lower_unique 
        ON profiles(LOWER(username)) 
        WHERE username IS NOT NULL;
    END IF;
    
    -- For communities.slug
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'communities_slug_lower_unique'
    ) THEN
        -- First drop the existing unique constraint if it exists
        ALTER TABLE communities DROP CONSTRAINT IF EXISTS communities_slug_key;
        
        -- Create case-insensitive unique index
        CREATE UNIQUE INDEX communities_slug_lower_unique 
        ON communities(LOWER(slug));
    END IF;
    
    -- For events.slug (within community scope)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'events_community_slug_lower_unique'
    ) THEN
        -- Drop existing constraint if exists
        ALTER TABLE events DROP CONSTRAINT IF EXISTS events_community_id_slug_key;
        
        -- Create case-insensitive unique index
        CREATE UNIQUE INDEX events_community_slug_lower_unique 
        ON events(community_id, LOWER(slug));
    END IF;
END $$;

-- 7. Add performance indexes
DO $$ 
BEGIN
    -- Frequently queried combinations
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_community_status_start') THEN
        CREATE INDEX idx_events_community_status_start 
        ON events(community_id, status, start_at DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tickets_event_status') THEN
        CREATE INDEX idx_tickets_event_status 
        ON tickets(event_id, status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_event_status') THEN
        CREATE INDEX idx_orders_event_status 
        ON orders(event_id, status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_buyer_status') THEN
        CREATE INDEX idx_orders_buyer_status 
        ON orders(buyer_id, status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_community_members_user_community') THEN
        CREATE INDEX idx_community_members_user_community 
        ON community_members(user_id, community_id);
    END IF;
END $$;

-- 8. Update RLS policies to use new foreign keys
-- Enable RLS on all tables if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- Add policy for events.created_by
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
    CREATE POLICY "Events are viewable by everyone" 
    ON events FOR SELECT 
    USING (
        status = 'published' 
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = events.community_id 
            AND user_id = auth.uid() 
            AND role IN ('admin', 'moderator')
        )
    );
    
    DROP POLICY IF EXISTS "Events are editable by creator and community admins" ON events;
    CREATE POLICY "Events are editable by creator and community admins" 
    ON events FOR ALL 
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = events.community_id 
            AND user_id = auth.uid() 
            AND role = 'admin'
        )
    );
END $$;

-- 9. Add comments for documentation
COMMENT ON COLUMN events.created_by IS 'User who created the event';
COMMENT ON COLUMN orders.status IS 'Current status of the order';
COMMENT ON COLUMN orders.provider IS 'Payment provider used for this order';
COMMENT ON COLUMN passes.status IS 'Current status of the pass';
COMMENT ON TYPE order_status IS 'Possible statuses for an order';
COMMENT ON TYPE payment_provider IS 'Supported payment providers';
COMMENT ON TYPE pass_status IS 'Possible statuses for a pass';

-- 10. Validate constraints
DO $$ 
BEGIN
    -- Ensure all orders have valid buyer_id
    IF EXISTS (
        SELECT 1 FROM orders 
        WHERE buyer_id NOT IN (SELECT id FROM profiles)
    ) THEN
        RAISE WARNING 'Found orders with invalid buyer_id references';
    END IF;
    
    -- Ensure all events have valid created_by
    IF EXISTS (
        SELECT 1 FROM events 
        WHERE created_by IS NOT NULL 
        AND created_by NOT IN (SELECT id FROM profiles)
    ) THEN
        RAISE WARNING 'Found events with invalid created_by references';
    END IF;
END $$;