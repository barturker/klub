-- =============================================
-- Migration: Drop ALL RLS Policies (Debug)
-- Version: 00013
-- Created: 2025-01-13
-- Description: Drops ALL RLS policies from all tables to debug infinite recursion
-- =============================================

-- =============================================
-- PHASE 1: Drop ALL policies from communities
-- =============================================

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'communities' 
          AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON communities', pol.policyname);
    END LOOP;
END $$;

-- =============================================
-- PHASE 2: Drop ALL policies from community_members
-- =============================================

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'community_members' 
          AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON community_members', pol.policyname);
    END LOOP;
END $$;

-- =============================================
-- PHASE 3: Drop ALL policies from events
-- =============================================

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'events' 
          AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON events', pol.policyname);
    END LOOP;
END $$;

-- =============================================
-- PHASE 4: Drop ALL policies from profiles
-- =============================================

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' 
          AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- =============================================
-- PHASE 5: Create ULTRA SIMPLE policies - NO RECURSION
-- =============================================

-- Communities: Everyone can read (temporary for debugging)
CREATE POLICY "communities_read_all"
ON communities
FOR SELECT
USING (true);

-- Communities: Authenticated users can insert their own
CREATE POLICY "communities_insert_own"
ON communities
FOR INSERT
WITH CHECK (auth.uid() = organizer_id);

-- Communities: Organizers can update
CREATE POLICY "communities_update_own"
ON communities
FOR UPDATE
USING (auth.uid() = organizer_id)
WITH CHECK (auth.uid() = organizer_id);

-- Communities: Organizers can delete
CREATE POLICY "communities_delete_own"
ON communities
FOR DELETE
USING (auth.uid() = organizer_id);

-- =============================================
-- PHASE 6: Simple community_members policies
-- =============================================

-- Members: Everyone can read (temporary)
CREATE POLICY "members_read_all"
ON community_members
FOR SELECT
USING (true);

-- Members: Users can add themselves
CREATE POLICY "members_insert_self"
ON community_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Members: Users can remove themselves
CREATE POLICY "members_delete_self"
ON community_members
FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- PHASE 7: Simple events policies
-- =============================================

-- Events: Everyone can read
CREATE POLICY "events_read_all"
ON events
FOR SELECT
USING (true);

-- =============================================
-- PHASE 8: Simple profiles policies
-- =============================================

-- Profiles: Everyone can read
CREATE POLICY "profiles_read_all"
ON profiles
FOR SELECT
USING (true);

-- Profiles: Users can update their own
CREATE POLICY "profiles_update_own"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- =============================================
-- Migration complete!
-- This creates the simplest possible policies to avoid recursion
-- =============================================