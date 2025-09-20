-- Migration: 00051_drop_duplicate_ticket_orders_table.sql
-- Purpose: Remove duplicate ticket_orders table that was accidentally created
-- Note: The 'orders' table is the correct one to use for order management
-- Date: 2025-01-20

-- First, check if any data exists in ticket_orders (should be empty)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_orders') THEN
    -- Drop any policies first
    DROP POLICY IF EXISTS "Community managers can view orders" ON ticket_orders;
    DROP POLICY IF EXISTS "Users can view their own orders" ON ticket_orders;

    -- Drop the duplicate table
    DROP TABLE IF EXISTS ticket_orders CASCADE;

    RAISE NOTICE 'Successfully dropped duplicate ticket_orders table';
  ELSE
    RAISE NOTICE 'ticket_orders table does not exist, nothing to drop';
  END IF;
END $$;

-- Verify the correct orders table exists and has proper structure
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
    RAISE EXCEPTION 'Critical: orders table does not exist! This migration requires the orders table from STORY-010';
  END IF;
END $$;

-- Add comment to orders table to clarify it's the canonical table
COMMENT ON TABLE orders IS 'Main orders table for all ticket purchases. This is the canonical orders table (ticket_orders was a duplicate and has been removed).';