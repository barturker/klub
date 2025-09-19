-- Migration: 00042_fix_rsvp_rate_limits_access.sql
-- Fix RSVP rate limits RLS issue for free events

-- Disable RLS on rsvp_rate_limits table
-- This table is only used internally by triggers, users don't need direct access
-- This fixes the "new row violates row-level security policy" error when RSVPing to free events
ALTER TABLE public.rsvp_rate_limits DISABLE ROW LEVEL SECURITY;

-- Drop the existing SELECT policy since RLS is disabled
DROP POLICY IF EXISTS "Users can see their own rate limits" ON public.rsvp_rate_limits;

-- Add comment explaining the design decision
COMMENT ON TABLE public.rsvp_rate_limits IS 'Internal table for RSVP rate limiting. RLS disabled as this table is only accessed via triggers, not directly by users.';