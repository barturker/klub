-- Check Bartu's profile and communities
SELECT
    p.id as user_id,
    p.username,
    p.full_name,
    p.email
FROM profiles p
WHERE p.username = 'barturker';

-- Check communities where Bartu is organizer
SELECT
    c.id,
    c.name,
    c.slug,
    c.organizer_id,
    c.privacy_level,
    p.username as organizer_username
FROM communities c
LEFT JOIN profiles p ON c.organizer_id = p.id
WHERE p.username = 'barturker';

-- Check Zımbads community specifically
SELECT
    c.id,
    c.name,
    c.slug,
    c.organizer_id,
    c.privacy_level,
    p.username as organizer_username,
    p.full_name as organizer_name
FROM communities c
LEFT JOIN profiles p ON c.organizer_id = p.id
WHERE c.slug = 'zimbads' OR c.name LIKE '%Zımbads%' OR c.name LIKE '%Zimbads%';

-- Check community memberships for Bartu
SELECT
    cm.community_id,
    c.name as community_name,
    cm.role,
    cm.joined_at
FROM community_members cm
JOIN communities c ON cm.community_id = c.id
JOIN profiles p ON cm.user_id = p.id
WHERE p.username = 'barturker';