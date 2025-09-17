-- =============================================
-- Manual SQL to run in Supabase Dashboard
-- =============================================

-- 1. First, update existing data - convert is_public to privacy_level
UPDATE communities
SET privacy_level = CASE
    WHEN is_public = true THEN 'public'
    WHEN is_public = false THEN 'private'
    ELSE 'public'
END
WHERE privacy_level IS NULL;

-- 2. Check your data
SELECT id, name, is_public, privacy_level, organizer_id FROM communities;

-- 3. Make specific community private (e.g., Zımba community)
UPDATE communities
SET privacy_level = 'private'
WHERE LOWER(name) LIKE '%zımba%' OR LOWER(name) LIKE '%zimba%';

-- 4. Drop temporary RLS policies
DROP POLICY IF EXISTS "communities_select_temp" ON communities;
DROP POLICY IF EXISTS "communities_insert_temp" ON communities;
DROP POLICY IF EXISTS "communities_update_temp" ON communities;
DROP POLICY IF EXISTS "communities_delete_temp" ON communities;

-- 5. Create proper RLS policy for SELECT
CREATE POLICY "communities_select_privacy"
ON communities
FOR SELECT
USING (
  -- Public communities are visible to everyone
  privacy_level = 'public'
  OR privacy_level IS NULL  -- treat null as public
  OR
  -- User is the organizer
  organizer_id = auth.uid()
  OR
  -- User is a member (for private and invite_only communities)
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = communities.id
      AND cm.user_id = auth.uid()
  )
);

-- 6. Keep simple policies for other operations
CREATE POLICY "communities_insert_auth"
ON communities
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND organizer_id = auth.uid()
);

CREATE POLICY "communities_update_admin"
ON communities
FOR UPDATE
USING (organizer_id = auth.uid())
WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "communities_delete_organizer"
ON communities
FOR DELETE
USING (organizer_id = auth.uid());