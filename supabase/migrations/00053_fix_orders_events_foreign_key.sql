-- Migration: 00053_fix_orders_events_foreign_key.sql
-- Purpose: Add missing foreign key constraint between orders and events tables
-- Date: 2025-01-20

-- Check if foreign key already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_event_id_fkey'
  ) THEN
    -- Add foreign key constraint
    ALTER TABLE orders
    ADD CONSTRAINT orders_event_id_fkey
    FOREIGN KEY (event_id)
    REFERENCES events(id)
    ON DELETE CASCADE;

    RAISE NOTICE 'Added foreign key constraint orders_event_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint orders_event_id_fkey already exists';
  END IF;
END $$;

-- Add index on event_id for better join performance
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON orders(event_id);

-- Add comment
COMMENT ON CONSTRAINT orders_event_id_fkey ON orders IS 'Foreign key linking orders to their associated events';