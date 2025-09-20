-- Fix RLS policies for orders to allow community admins/moderators to see orders
-- The issue is that the current policy only allows organizers, but users might be admins/moderators

-- Drop the restrictive policy
DROP POLICY IF EXISTS "orders_select_owner" ON public.orders;

-- Create a more flexible policy that allows community members with proper roles
CREATE POLICY "orders_select_community_member"
ON public.orders
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM events e
        JOIN communities c ON e.community_id = c.id
        JOIN community_members cm ON cm.community_id = c.id
        WHERE e.id = orders.event_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'moderator')
    )
    OR
    -- Also allow the original organizer access (backup)
    EXISTS (
        SELECT 1 FROM events e
        JOIN communities c ON e.community_id = c.id
        WHERE e.id = orders.event_id
        AND c.organizer_id = auth.uid()
    )
);

-- Also ensure the buyer policy is working correctly
DROP POLICY IF EXISTS "orders_select_buyer" ON public.orders;
CREATE POLICY "orders_select_buyer"
ON public.orders
FOR SELECT
USING (
    buyer_id = auth.uid()
    OR buyer_email = (auth.jwt() ->> 'email')
);

-- Add a policy for insert/update that works with community members
DROP POLICY IF EXISTS "orders_insert_buyer" ON public.orders;
CREATE POLICY "orders_insert_community"
ON public.orders
FOR INSERT
WITH CHECK (
    -- Allow buyers to create orders for themselves
    buyer_id = auth.uid()
    OR
    -- Allow community admins to create orders
    EXISTS (
        SELECT 1 FROM events e
        JOIN communities c ON e.community_id = c.id
        JOIN community_members cm ON cm.community_id = c.id
        WHERE e.id = orders.event_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'moderator')
    )
);

-- Update policy for community members
DROP POLICY IF EXISTS "orders_update_buyer" ON public.orders;
CREATE POLICY "orders_update_community"
ON public.orders
FOR UPDATE
USING (
    -- Allow buyers to update their pending orders
    (buyer_id = auth.uid() AND status = 'pending')
    OR
    -- Allow community admins to update orders
    EXISTS (
        SELECT 1 FROM events e
        JOIN communities c ON e.community_id = c.id
        JOIN community_members cm ON cm.community_id = c.id
        WHERE e.id = orders.event_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'moderator')
    )
)
WITH CHECK (
    -- Allow buyers to update their own orders
    buyer_id = auth.uid()
    OR
    -- Allow community admins to update any order
    EXISTS (
        SELECT 1 FROM events e
        JOIN communities c ON e.community_id = c.id
        JOIN community_members cm ON cm.community_id = c.id
        WHERE e.id = orders.event_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'moderator')
    )
);

-- Add a debug function to check user permissions
CREATE OR REPLACE FUNCTION debug_user_permissions(p_community_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    community_role TEXT,
    is_organizer BOOLEAN,
    current_user_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        auth.uid() as user_id,
        (auth.jwt() ->> 'email')::TEXT as user_email,
        cm.role::TEXT as community_role,
        (c.organizer_id = auth.uid()) as is_organizer,
        current_user::TEXT as current_user_name
    FROM communities c
    LEFT JOIN community_members cm ON cm.community_id = c.id AND cm.user_id = auth.uid()
    WHERE c.id = p_community_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION debug_user_permissions TO anon, authenticated;

-- Add comments
COMMENT ON POLICY "orders_select_community_member" ON public.orders IS
'Allows community admins, moderators, and organizers to view orders for events in their communities';

COMMENT ON POLICY "orders_select_buyer" ON public.orders IS
'Allows buyers to view their own orders';

COMMENT ON POLICY "orders_insert_community" ON public.orders IS
'Allows buyers and community admins to create orders';

COMMENT ON POLICY "orders_update_community" ON public.orders IS
'Allows buyers to update their pending orders and community admins to update any orders';

COMMENT ON FUNCTION debug_user_permissions IS
'Debug function to check user permissions and community membership';

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 00058: Fixed RLS policies to allow community admins/moderators access to orders';
END $$;