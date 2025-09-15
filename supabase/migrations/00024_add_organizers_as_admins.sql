-- Finally add organizers as admins to community_members table
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