-- Direct SQL fix for organizers
-- Run this manually in Supabase SQL Editor

-- Step 1: Check current state
SELECT c.id, c.name, c.organizer_id, cm.user_id, cm.role
FROM communities c
LEFT JOIN community_members cm ON c.id = cm.community_id AND c.organizer_id = cm.user_id;

-- Step 2: Insert missing organizers
INSERT INTO community_members (community_id, user_id, role, joined_at)
SELECT
    c.id,
    c.organizer_id,
    'admin'::member_role,
    c.created_at
FROM communities c
WHERE NOT EXISTS (
    SELECT 1
    FROM community_members cm
    WHERE cm.community_id = c.id
    AND cm.user_id = c.organizer_id
);

-- Step 3: Update existing non-admin organizers
UPDATE community_members
SET role = 'admin'
WHERE (community_id, user_id) IN (
    SELECT c.id, c.organizer_id
    FROM communities c
    JOIN community_members cm ON c.id = cm.community_id AND c.organizer_id = cm.user_id
    WHERE cm.role != 'admin'
);

-- Step 4: Verify the fix
SELECT c.name, cm.role, u.email
FROM communities c
JOIN community_members cm ON c.id = cm.community_id AND c.organizer_id = cm.user_id
JOIN auth.users u ON u.id = c.organizer_id;