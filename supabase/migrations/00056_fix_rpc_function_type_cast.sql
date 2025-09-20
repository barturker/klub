-- Fix the RPC function to properly cast status type
DROP FUNCTION IF EXISTS update_order_from_webhook;

CREATE OR REPLACE FUNCTION update_order_from_webhook(
    p_session_id TEXT,
    p_status TEXT,
    p_payment_intent_id TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL,
    p_paid_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    status TEXT,
    updated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to run with elevated privileges
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
BEGIN
    -- Find the order by session ID
    SELECT o.* INTO v_order
    FROM orders o
    WHERE (o.metadata->>'stripe_session_id' = p_session_id
           OR o.stripe_session_id = p_session_id)
    AND o.status IN ('pending', 'processing')
    LIMIT 1;

    -- If order found, update it
    IF v_order.id IS NOT NULL THEN
        UPDATE orders
        SET
            status = p_status::order_status, -- CRITICAL: Cast to order_status enum type!
            stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id),
            stripe_session_id = p_session_id, -- Also save the session ID to the column
            payment_method = COALESCE(p_payment_method, payment_method),
            paid_at = CASE WHEN p_status = 'paid' THEN COALESCE(p_paid_at, NOW()) ELSE paid_at END,
            updated_at = NOW()
        WHERE orders.id = v_order.id;

        RETURN QUERY
        SELECT v_order.id, p_status::TEXT, true;
    ELSE
        -- No order found
        RETURN QUERY
        SELECT NULL::UUID, p_status::TEXT, false;
    END IF;
END;
$$;

-- Grant execute permission on the function to anon and authenticated roles
GRANT EXECUTE ON FUNCTION update_order_from_webhook TO anon, authenticated;

-- Add comment explaining the security model
COMMENT ON FUNCTION update_order_from_webhook IS
'Securely updates order status from Stripe webhooks. Uses session ID as authentication token. SECURITY DEFINER allows it to bypass RLS while maintaining security through session ID validation. Fixed type casting for order_status enum.';

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 00056: Fixed RPC function type casting for order_status enum';
END $$;