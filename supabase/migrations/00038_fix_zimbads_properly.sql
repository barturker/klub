-- Fix ZIMBADS privacy settings
-- is_private is a generated column, so we only update is_public

UPDATE communities
SET is_public = false  -- Set to false since privacy_level is 'private'
WHERE slug = 'zimbads';

-- Ensure Bartu is properly registered as admin member
INSERT INTO community_members (community_id, user_id, role, joined_at)
SELECT
    '425ed2b0-f1fb-49a0-97b0-08da0d3901b0',
    '4e91b95a-a446-4668-90c4-aec5698eeff8',
    'admin',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = '425ed2b0-f1fb-49a0-97b0-08da0d3901b0'
      AND user_id = '4e91b95a-a446-4668-90c4-aec5698eeff8'
);

-- If already exists, ensure admin role
UPDATE community_members
SET role = 'admin'
WHERE community_id = '425ed2b0-f1fb-49a0-97b0-08da0d3901b0'
  AND user_id = '4e91b95a-a446-4668-90c4-aec5698eeff8'
  AND role != 'admin';