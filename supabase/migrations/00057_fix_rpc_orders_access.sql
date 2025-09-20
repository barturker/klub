-- Fix RPC function access to orders table
-- The issue is that SECURITY DEFINER alone isn't enough when RLS policies are too restrictive
-- We need to ensure the RPC function can access orders even from webhook/anon context

-- First, let's add debugging to understand what's happening
CREATE OR REPLACE FUNCTION debug_order_access(p_session_id TEXT)
RETURNS TABLE (
    order_id UUID,
    order_status TEXT,
    session_in_metadata TEXT,
    session_in_column TEXT,
    db_user TEXT,
    db_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- This function helps us debug what's happening with order access
    RETURN QUERY
    SELECT
        o.id,
        o.status::TEXT,
        o.metadata->>'stripe_session_id',
        o.stripe_session_id,
        current_user::TEXT,
        current_setting('role')::TEXT
    FROM orders o
    WHERE (o.metadata->>'stripe_session_id' = p_session_id
           OR o.stripe_session_id = p_session_id)
    ORDER BY o.created_at DESC
    LIMIT 5;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION debug_order_access TO anon, authenticated;

-- Now let's improve the main RPC function with better access patterns
-- The key insight is that SECURITY DEFINER should bypass RLS completely
-- If it's not working, we may need to be more explicit

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
    updated BOOLEAN,
    debug_info JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER -- This should bypass ALL RLS policies
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_found_count INTEGER;
    v_debug_info JSONB;
BEGIN
    -- Add comprehensive debugging

    -- First, count how many orders match our criteria (with RLS bypass)
    SELECT COUNT(*) INTO v_found_count
    FROM orders o
    WHERE (o.metadata->>'stripe_session_id' = p_session_id
           OR o.stripe_session_id = p_session_id);

    -- Build debug info
    v_debug_info := jsonb_build_object(
        'session_id', p_session_id,
        'total_matching_orders', v_found_count,
        'function_user', current_user,
        'function_role', current_setting('role'),
        'search_timestamp', NOW()
    );

    -- Find the order by session ID with status filter
    SELECT o.* INTO v_order
    FROM orders o
    WHERE (o.metadata->>'stripe_session_id' = p_session_id
           OR o.stripe_session_id = p_session_id)
    AND o.status IN ('pending', 'processing')
    LIMIT 1;

    -- If order found, update it
    IF v_order.id IS NOT NULL THEN
        -- Update with proper type casting
        UPDATE orders
        SET
            status = p_status::order_status, -- Cast to enum type
            stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id),
            stripe_session_id = p_session_id, -- Also save the session ID to the column
            payment_method = COALESCE(p_payment_method, payment_method),
            paid_at = CASE WHEN p_status = 'paid' THEN COALESCE(p_paid_at, NOW()) ELSE paid_at END,
            updated_at = NOW()
        WHERE orders.id = v_order.id;

        -- Add success info to debug
        v_debug_info := v_debug_info || jsonb_build_object(
            'found_order_id', v_order.id,
            'original_status', v_order.status,
            'new_status', p_status,
            'updated', true
        );

        RETURN QUERY
        SELECT v_order.id, p_status::TEXT, true, v_debug_info;
    ELSE
        -- No order found - add failure info to debug
        v_debug_info := v_debug_info || jsonb_build_object(
            'found_order_id', NULL,
            'updated', false,
            'reason', 'No matching order found or order not in pending/processing status'
        );

        RETURN QUERY
        SELECT NULL::UUID, p_status::TEXT, false, v_debug_info;
    END IF;
END;
$$;

-- Grant execute permission on the function to anon and authenticated roles
GRANT EXECUTE ON FUNCTION update_order_from_webhook TO anon, authenticated;

-- Also add a policy that explicitly allows webhook access
-- This is a backup in case SECURITY DEFINER isn't fully bypassing RLS
DROP POLICY IF EXISTS "orders_webhook_access" ON public.orders;
CREATE POLICY "orders_webhook_access"
ON public.orders
FOR ALL
USING (
    -- Allow access when being called from our webhook function context
    -- We can identify this by checking if the current user is the function definer
    current_user = 'postgres' -- SECURITY DEFINER functions run as the function owner
)
WITH CHECK (
    current_user = 'postgres'
);

-- Add comment explaining the enhanced security model
COMMENT ON FUNCTION update_order_from_webhook IS
'Enhanced webhook order updater with comprehensive debugging. Uses SECURITY DEFINER to bypass RLS. Includes detailed debug information to help troubleshoot access issues.';

COMMENT ON FUNCTION debug_order_access IS
'Debug function to understand order access patterns and RLS behavior. Helps troubleshoot webhook and RPC access issues.';

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 00057: Enhanced RPC function with debug capabilities and improved RLS handling';
END $$;