-- =============================================
-- FIX is_public column to match privacy_level
-- =============================================

-- Step 1: Update is_public based on privacy_level
UPDATE communities
SET is_public = CASE
    WHEN privacy_level = 'public' THEN true
    WHEN privacy_level = 'private' THEN false
    WHEN privacy_level = 'invite_only' THEN false
    ELSE true -- default to public if null
END;

-- Step 2: Check the results
SELECT
    id,
    name,
    is_public,
    privacy_level,
    organizer_id,
    CASE
        WHEN is_public = true AND privacy_level = 'public' THEN '✅ OK'
        WHEN is_public = false AND privacy_level IN ('private', 'invite_only') THEN '✅ OK'
        ELSE '❌ MISMATCH!'
    END as status
FROM communities
ORDER BY created_at DESC;