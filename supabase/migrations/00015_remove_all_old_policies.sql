-- =============================================
-- SIMPLE FIX: Remove ALL old policies causing recursion
-- Keep ONLY the new simple ones
-- =============================================

-- Step 1: Drop ALL existing policies on both tables
-- (We already have simple replacements from migration 14)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on communities except the new simple ones
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'communities' 
        AND policyname NOT IN (
            'communities_simple_view',
            'communities_insert_authenticated', 
            'communities_update_organizer',
            'Organizers manage communities'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON communities', pol.policyname);
    END LOOP;

    -- Drop all policies on community_members except the new simple ones
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'community_members'
        AND policyname NOT IN (
            'cm_simple_own_only',
            'cm_insert_self_v2',
            'cm_delete_self_v2',
            'cm_update_organizer_v2'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON community_members', pol.policyname);
    END LOOP;
END $$;

-- That's it! Simple.