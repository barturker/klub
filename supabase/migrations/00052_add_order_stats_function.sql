-- Migration: 00052_add_order_stats_function.sql
-- Purpose: Add RPC function to get community order statistics
-- Date: 2025-01-20

-- Create function to get community order statistics
CREATE OR REPLACE FUNCTION get_community_order_stats(p_community_id UUID)
RETURNS TABLE (
  total_orders BIGINT,
  total_revenue BIGINT,
  total_fees BIGINT,
  total_refunded BIGINT,
  pending_orders BIGINT,
  completed_orders BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH order_stats AS (
    SELECT
      COUNT(*)::BIGINT as total_orders,
      COALESCE(SUM(CASE WHEN o.status IN ('paid', 'partially_refunded') THEN o.amount_cents ELSE 0 END), 0)::BIGINT as total_revenue,
      COALESCE(SUM(CASE WHEN o.status IN ('paid', 'partially_refunded') THEN o.fee_cents ELSE 0 END), 0)::BIGINT as total_fees,
      COUNT(CASE WHEN o.status = 'pending' THEN 1 END)::BIGINT as pending_orders,
      COUNT(CASE WHEN o.status = 'paid' THEN 1 END)::BIGINT as completed_orders
    FROM orders o
    INNER JOIN events e ON e.id = o.event_id
    WHERE e.community_id = p_community_id
  ),
  refund_stats AS (
    SELECT
      COALESCE(SUM(r.amount_cents), 0)::BIGINT as total_refunded
    FROM refunds r
    INNER JOIN orders o ON o.id = r.order_id
    INNER JOIN events e ON e.id = o.event_id
    WHERE e.community_id = p_community_id
    AND r.status = 'succeeded'
  )
  SELECT
    os.total_orders,
    os.total_revenue,
    os.total_fees,
    rs.total_refunded,
    os.pending_orders,
    os.completed_orders
  FROM order_stats os
  CROSS JOIN refund_stats rs;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_community_order_stats(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_community_order_stats(UUID) IS 'Get order statistics for a specific community including revenue, refunds, and order counts';