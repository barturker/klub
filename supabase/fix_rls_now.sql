-- =============================================
-- IMMEDIATE FIX - Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Drop ALL existing policies first
DROP POLICY IF EXISTS "communities_select_temp" ON communities;
DROP POLICY IF EXISTS "communities_insert_temp" ON communities;
DROP POLICY IF EXISTS "communities_update_temp" ON communities;
DROP POLICY IF EXISTS "communities_delete_temp" ON communities;
DROP POLICY IF EXISTS "communities_select_policy" ON communities;
DROP POLICY IF EXISTS "communities_select_privacy" ON communities;
DROP POLICY IF EXISTS "communities_insert_auth" ON communities;
DROP POLICY IF EXISTS "communities_update_admin" ON communities;
DROP POLICY IF EXISTS "communities_delete_organizer" ON communities;

-- Step 2: Drop community_members policies too
DROP POLICY IF EXISTS "community_members_select_temp" ON community_members;
DROP POLICY IF EXISTS "community_members_insert_temp" ON community_members;
DROP POLICY IF EXISTS "community_members_delete_temp" ON community_members;
DROP POLICY IF EXISTS "community_members_select_members" ON community_members;
DROP POLICY IF EXISTS "community_members_insert_join" ON community_members;
DROP POLICY IF EXISTS "community_members_update_admin" ON community_members;
DROP POLICY IF EXISTS "community_members_delete_leave" ON community_members;

-- Step 3: Create SIMPLE working policies for communities
CREATE POLICY "allow_all_select"
ON communities
FOR SELECT
USING (true);  -- Temporarily allow all reads to test

CREATE POLICY "allow_auth_insert"
ON communities
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "allow_owner_update"
ON communities
FOR UPDATE
USING (organizer_id = auth.uid())
WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "allow_owner_delete"
ON communities
FOR DELETE
USING (organizer_id = auth.uid());

-- Step 4: Create SIMPLE working policies for community_members
CREATE POLICY "allow_all_select_members"
ON community_members
FOR SELECT
USING (true);  -- Temporarily allow all reads

CREATE POLICY "allow_join"
ON community_members
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "allow_leave"
ON community_members
FOR DELETE
USING (user_id = auth.uid());

-- Step 5: Update privacy_level data
UPDATE communities
SET privacy_level = CASE
    WHEN is_public = true THEN 'public'
    WHEN is_public = false THEN 'private'
    ELSE 'public'
END
WHERE privacy_level IS NULL;

-- Step 6: Make ZIMBA private
UPDATE communities
SET privacy_level = 'private'
WHERE LOWER(name) LIKE '%zimba%' AND name != 'ZIMBADS';

-- Step 7: Check the results
SELECT id, name, is_public, privacy_level, organizer_id
FROM communities
ORDER BY created_at DESC;