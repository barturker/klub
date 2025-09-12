-- =============================================
-- Migration: Community Branding & Settings
-- Version: 00010
-- Created: 2025-01-12
-- Description: Adds branding, theming, privacy levels, and settings management
-- =============================================

-- =============================================
-- PHASE 1: Add new columns to communities table
-- =============================================

-- Add theme_color with hex validation
ALTER TABLE communities
ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#3B82F6';

ALTER TABLE communities
DROP CONSTRAINT IF EXISTS theme_color_hex_check;

ALTER TABLE communities
ADD CONSTRAINT theme_color_hex_check CHECK (
  theme_color IS NULL OR 
  theme_color ~* '^#[0-9A-Fa-f]{6}$'
);

-- Add privacy_level with TEXT+CHECK (not ENUM for flexibility)
ALTER TABLE communities
ADD COLUMN IF NOT EXISTS privacy_level TEXT DEFAULT 'public';

ALTER TABLE communities
DROP CONSTRAINT IF EXISTS privacy_level_check;

ALTER TABLE communities
ADD CONSTRAINT privacy_level_check CHECK (
  privacy_level IN ('public', 'private', 'invite_only')
);

-- Add custom_domain with proper validation
ALTER TABLE communities
ADD COLUMN IF NOT EXISTS custom_domain TEXT;

-- Ensure custom domain format is valid (subdomain support)
ALTER TABLE communities
DROP CONSTRAINT IF EXISTS custom_domain_format_check;

ALTER TABLE communities
ADD CONSTRAINT custom_domain_format_check CHECK (
  custom_domain IS NULL OR
  custom_domain ~* '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$'
);

-- Add features JSONB for feature toggles
ALTER TABLE communities
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{"events": true, "discussions": true, "resources": true}'::jsonb;

-- Add generated column for frequently filtered feature
ALTER TABLE communities
DROP COLUMN IF EXISTS has_events;

ALTER TABLE communities
ADD COLUMN has_events BOOLEAN
GENERATED ALWAYS AS (COALESCE((features->>'events')::boolean, false)) STORED;

-- Add audit columns for tracking changes
ALTER TABLE communities
ADD COLUMN IF NOT EXISTS last_settings_changed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_settings_changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Rename cover_url to cover_image_url for consistency (if exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'communities' 
    AND column_name = 'cover_url'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'communities' 
      AND column_name = 'cover_image_url'
    )
  ) THEN
    ALTER TABLE communities RENAME COLUMN cover_url TO cover_image_url;
  END IF;
END $$;

-- Add cover_image_url if it doesn't exist
ALTER TABLE communities
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- =============================================
-- PHASE 2: Create indexes for performance
-- =============================================

-- Case-insensitive unique index for custom domains
DROP INDEX IF EXISTS idx_communities_custom_domain_ci;
CREATE UNIQUE INDEX idx_communities_custom_domain_ci
ON communities (LOWER(custom_domain))
WHERE custom_domain IS NOT NULL;

-- Index for privacy level filtering
DROP INDEX IF EXISTS idx_communities_privacy_level;
CREATE INDEX idx_communities_privacy_level
ON communities (privacy_level)
WHERE privacy_level != 'public';

-- Index for has_events filtering
DROP INDEX IF EXISTS idx_communities_has_events;
CREATE INDEX idx_communities_has_events
ON communities (has_events)
WHERE has_events = true;

-- GIN index for JSONB features queries
DROP INDEX IF EXISTS idx_communities_features_gin;
CREATE INDEX idx_communities_features_gin
ON communities USING GIN (features jsonb_path_ops);

-- =============================================
-- PHASE 3: Settings history tracking table
-- =============================================

CREATE TABLE IF NOT EXISTS community_settings_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Snapshot approach for complete history
  old_values JSONB,
  new_values JSONB NOT NULL,
  changed_fields TEXT[] NOT NULL,
  
  -- Metadata
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Optional: IP address for audit trail
  ip_address INET,
  user_agent TEXT
);

-- Indexes for settings history
DROP INDEX IF EXISTS idx_settings_history_community;
CREATE INDEX idx_settings_history_community
ON community_settings_history (community_id, changed_at DESC);

DROP INDEX IF EXISTS idx_settings_history_changed_by;
CREATE INDEX idx_settings_history_changed_by
ON community_settings_history (changed_by, changed_at DESC);

DROP INDEX IF EXISTS idx_settings_history_change_type;
CREATE INDEX idx_settings_history_change_type
ON community_settings_history (change_type);

-- =============================================
-- PHASE 4: Join requests for privacy management
-- =============================================

CREATE TABLE IF NOT EXISTS community_join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Request details
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  request_message TEXT,
  rejection_reason TEXT,
  
  -- Timestamps
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Prevent duplicate requests
  UNIQUE(community_id, user_id)
);

-- Indexes for join requests
DROP INDEX IF EXISTS idx_join_requests_community_status;
CREATE INDEX idx_join_requests_community_status
ON community_join_requests (community_id, status)
WHERE status = 'pending';

DROP INDEX IF EXISTS idx_join_requests_user;
CREATE INDEX idx_join_requests_user
ON community_join_requests (user_id, status);

DROP INDEX IF EXISTS idx_join_requests_expires;
CREATE INDEX idx_join_requests_expires
ON community_join_requests (expires_at)
WHERE status = 'pending';

-- =============================================
-- PHASE 5: Feature dependencies constraint
-- =============================================

ALTER TABLE communities
DROP CONSTRAINT IF EXISTS features_dependencies_check;

ALTER TABLE communities
ADD CONSTRAINT features_dependencies_check CHECK (
  -- If events is disabled, tickets must also be disabled
  COALESCE((features->>'events')::boolean, false) = true
  OR COALESCE((features->>'tickets')::boolean, false) = false
);

-- =============================================
-- PHASE 6: Row Level Security (RLS)
-- =============================================

-- Enable RLS on new tables
ALTER TABLE community_settings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_join_requests ENABLE ROW LEVEL SECURITY;

-- Communities table: SELECT policy respecting privacy levels
DROP POLICY IF EXISTS "communities_select_policy" ON communities;
CREATE POLICY "communities_select_policy"
ON communities
FOR SELECT
USING (
  -- Public communities visible to all
  privacy_level = 'public'
  OR
  -- User is the organizer
  organizer_id = auth.uid()
  OR
  -- User is a member
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = communities.id
      AND cm.user_id = auth.uid()
  )
);

-- Communities table: UPDATE policy for organizers and admins
DROP POLICY IF EXISTS "communities_update_policy" ON communities;
CREATE POLICY "communities_update_policy"
ON communities
FOR UPDATE
USING (
  -- User is the organizer
  organizer_id = auth.uid()
  OR
  -- User is an admin
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = communities.id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
  )
)
WITH CHECK (
  -- Same conditions as USING clause
  organizer_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = communities.id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
  )
);

-- Settings history: Only admins/mods can view
DROP POLICY IF EXISTS "settings_history_select_policy" ON community_settings_history;
CREATE POLICY "settings_history_select_policy"
ON community_settings_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = community_settings_history.community_id
    AND (
      c.organizer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = c.id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('admin', 'moderator')
      )
    )
  )
);

-- Join requests: INSERT policy
DROP POLICY IF EXISTS "join_requests_insert_policy" ON community_join_requests;
CREATE POLICY "join_requests_insert_policy"
ON community_join_requests
FOR INSERT
WITH CHECK (
  -- User can only create request for themselves
  user_id = auth.uid()
  AND
  -- Community must be private or invite_only
  EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = community_join_requests.community_id
      AND c.privacy_level IN ('private', 'invite_only')
  )
  AND
  -- User must not already be a member
  NOT EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_join_requests.community_id
      AND cm.user_id = auth.uid()
  )
);

-- Join requests: SELECT policy
DROP POLICY IF EXISTS "join_requests_select_policy" ON community_join_requests;
CREATE POLICY "join_requests_select_policy"
ON community_join_requests
FOR SELECT
USING (
  -- User can see their own requests
  user_id = auth.uid()
  OR
  -- Admins/mods can see all requests for their community
  EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = community_join_requests.community_id
    AND (
      c.organizer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = c.id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('admin', 'moderator')
      )
    )
  )
);

-- Join requests: UPDATE policy (for processing requests)
DROP POLICY IF EXISTS "join_requests_update_policy" ON community_join_requests;
CREATE POLICY "join_requests_update_policy"
ON community_join_requests
FOR UPDATE
USING (
  -- Only admins/mods can process requests
  EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = community_join_requests.community_id
    AND (
      c.organizer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = c.id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('admin', 'moderator')
      )
    )
  )
  OR
  -- User can cancel their own pending request
  (user_id = auth.uid() AND status = 'pending')
)
WITH CHECK (
  -- Same conditions as USING clause
  EXISTS (
    SELECT 1 FROM communities c
    WHERE c.id = community_join_requests.community_id
    AND (
      c.organizer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = c.id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('admin', 'moderator')
      )
    )
  )
  OR
  -- User can cancel their own pending request
  (user_id = auth.uid())
);

-- =============================================
-- PHASE 7: Helper functions
-- =============================================

-- Function to track settings changes (called from application)
CREATE OR REPLACE FUNCTION track_community_settings_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if specific fields changed
  IF (OLD.name IS DISTINCT FROM NEW.name)
    OR (OLD.description IS DISTINCT FROM NEW.description)
    OR (OLD.theme_color IS DISTINCT FROM NEW.theme_color)
    OR (OLD.privacy_level IS DISTINCT FROM NEW.privacy_level)
    OR (OLD.custom_domain IS DISTINCT FROM NEW.custom_domain)
    OR (OLD.features IS DISTINCT FROM NEW.features)
    OR (OLD.logo_url IS DISTINCT FROM NEW.logo_url)
    OR (OLD.cover_image_url IS DISTINCT FROM NEW.cover_image_url)
  THEN
    -- Update audit columns
    NEW.last_settings_changed_at = NOW();
    NEW.last_settings_changed_by = auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic audit
DROP TRIGGER IF EXISTS community_settings_audit_trigger ON communities;
CREATE TRIGGER community_settings_audit_trigger
BEFORE UPDATE ON communities
FOR EACH ROW
EXECUTE FUNCTION track_community_settings_change();

-- Function to auto-expire old pending join requests
CREATE OR REPLACE FUNCTION expire_old_join_requests()
RETURNS void AS $$
BEGIN
  UPDATE community_join_requests
  SET status = 'cancelled'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PHASE 8: Storage bucket setup (documentation)
-- =============================================

-- Note: Storage buckets must be created manually in Supabase Dashboard:
-- 1. Create 'community-logos' bucket (public read)
-- 2. Create 'community-covers' bucket (public read)
-- 3. Set max file size: 5MB for logos, 10MB for covers
-- 4. File types: image/jpeg, image/png, image/webp, image/gif
--
-- Storage path convention:
-- - Logos: community-logos/{community_id}/logo_{timestamp}.{ext}
-- - Covers: community-covers/{community_id}/cover_{timestamp}.{ext}

-- =============================================
-- PHASE 9: Comments for documentation
-- =============================================

COMMENT ON TABLE community_settings_history IS 'Tracks all changes to community settings for audit purposes';
COMMENT ON TABLE community_join_requests IS 'Manages join requests for private and invite-only communities';
COMMENT ON COLUMN communities.privacy_level IS 'Controls community visibility: public (anyone can view/join), private (anyone can view, request to join), invite_only (hidden, invite required)';
COMMENT ON COLUMN communities.theme_color IS 'Primary brand color in hex format (#RRGGBB)';
COMMENT ON COLUMN communities.custom_domain IS 'Optional custom domain for white-label communities';
COMMENT ON COLUMN communities.features IS 'Feature toggles for community functionality';
COMMENT ON COLUMN communities.has_events IS 'Generated column for efficient event feature filtering';

-- =============================================
-- Migration complete!
-- =============================================