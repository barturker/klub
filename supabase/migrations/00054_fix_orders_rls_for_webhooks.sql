-- Fix RLS policies for orders table to allow webhook updates
-- This migration adds UPDATE policies and ensures service role can manage orders

-- Drop existing UPDATE policies if any exist
DROP POLICY IF EXISTS "orders_update_buyer" ON public.orders;
DROP POLICY IF EXISTS "orders_update_service" ON public.orders;
DROP POLICY IF EXISTS "System can manage orders" ON public.orders;

-- Create UPDATE policy for buyers to update their own orders
CREATE POLICY "orders_update_buyer"
ON public.orders
FOR UPDATE
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());

-- Create policy for service role to manage all orders (for webhooks)
-- This allows the webhook endpoint (which uses service role) to update order status
CREATE POLICY "Service role can manage orders"
ON public.orders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Also ensure anon role can't do anything with orders
DROP POLICY IF EXISTS "Anon users cannot access orders" ON public.orders;

-- Add index on metadata->>'stripe_session_id' for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id
ON public.orders ((metadata->>'stripe_session_id'))
WHERE metadata->>'stripe_session_id' IS NOT NULL;

-- Add index on stripe_session_id column for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id_column
ON public.orders (stripe_session_id)
WHERE stripe_session_id IS NOT NULL;

-- Add helpful comment
COMMENT ON POLICY "Service role can manage orders" ON public.orders IS
'Allows Stripe webhooks (via service role) to update order status after payment';

-- Ensure orders table has proper status values
-- Update any invalid statuses to 'pending'
UPDATE public.orders
SET status = 'pending'
WHERE status NOT IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled');

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 00054: Fixed RLS policies for orders table to allow webhook updates';
END $$;