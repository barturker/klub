-- Add fee_cents column to orders table if it doesn't exist
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS fee_cents INTEGER DEFAULT 0;