-- Fix discount_codes RLS policies to allow public viewing and validation
-- Also ensure RPC functions exist

-- Drop existing restrictive RLS policy
DROP POLICY IF EXISTS "Active discount codes are viewable" ON discount_codes;

-- Create new policy: Anyone can view discount codes for validation
CREATE POLICY "Discount codes viewable for validation"
  ON discount_codes
  FOR SELECT
  USING (true); -- Allow all reads - validation will happen in functions

-- Ensure RPC functions exist (recreate if missing)
-- Function to validate a discount code
CREATE OR REPLACE FUNCTION validate_discount_code(
  p_event_id UUID,
  p_code TEXT,
  p_tier_id UUID DEFAULT NULL
) RETURNS TABLE (
  is_valid BOOLEAN,
  discount_type TEXT,
  discount_value INTEGER,
  message TEXT
) AS $$
DECLARE
  v_code_record RECORD;
BEGIN
  -- Find the discount code
  SELECT * INTO v_code_record
  FROM discount_codes dc
  WHERE UPPER(dc.code) = UPPER(p_code)
  AND dc.event_id = p_event_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      FALSE,
      NULL::TEXT,
      NULL::INTEGER,
      'Invalid discount code'::TEXT;
    RETURN;
  END IF;

  -- Check if code has expired
  IF v_code_record.valid_until IS NOT NULL AND v_code_record.valid_until <= NOW() THEN
    RETURN QUERY SELECT
      FALSE,
      NULL::TEXT,
      NULL::INTEGER,
      'Discount code has expired'::TEXT;
    RETURN;
  END IF;

  -- Check if code is not yet valid
  IF v_code_record.valid_from > NOW() THEN
    RETURN QUERY SELECT
      FALSE,
      NULL::TEXT,
      NULL::INTEGER,
      'Discount code is not yet valid'::TEXT;
    RETURN;
  END IF;

  -- Check usage limit
  IF v_code_record.usage_limit IS NOT NULL AND v_code_record.usage_count >= v_code_record.usage_limit THEN
    RETURN QUERY SELECT
      FALSE,
      NULL::TEXT,
      NULL::INTEGER,
      'Discount code usage limit reached'::TEXT;
    RETURN;
  END IF;

  -- Check tier applicability
  IF p_tier_id IS NOT NULL AND
     v_code_record.applicable_tiers IS NOT NULL AND
     NOT (p_tier_id = ANY(v_code_record.applicable_tiers)) THEN
    RETURN QUERY SELECT
      FALSE,
      NULL::TEXT,
      NULL::INTEGER,
      'Discount code not valid for this ticket tier'::TEXT;
    RETURN;
  END IF;

  -- Code is valid
  RETURN QUERY SELECT
    TRUE,
    v_code_record.discount_type,
    v_code_record.discount_value,
    CASE
      WHEN v_code_record.discount_type = 'percentage' THEN
        'Discount applied: ' || v_code_record.discount_value || '% off'
      ELSE
        'Discount applied: Fixed amount'
    END::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate ticket price with discounts and fees
CREATE OR REPLACE FUNCTION calculate_ticket_price(
  p_tier_id UUID,
  p_quantity INTEGER,
  p_discount_code TEXT DEFAULT NULL
) RETURNS TABLE (
  subtotal_cents INTEGER,
  discount_cents INTEGER,
  fees_cents INTEGER,
  total_cents INTEGER,
  currency TEXT
) AS $$
DECLARE
  v_base_price INTEGER;
  v_currency TEXT;
  v_discount_amount INTEGER := 0;
  v_group_discount INTEGER := 0;
  v_code_discount INTEGER := 0;
  v_subtotal INTEGER;
  v_fees INTEGER;
  v_event_id UUID;
BEGIN
  -- Get base price and currency from tier
  SELECT
    tt.price_cents,
    COALESCE(tt.currency, 'USD'),
    tt.event_id
  INTO v_base_price, v_currency, v_event_id
  FROM ticket_tiers tt
  WHERE tt.id = p_tier_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket tier not found';
  END IF;

  -- Validate quantity
  IF p_quantity < 1 THEN
    RAISE EXCEPTION 'Quantity must be at least 1';
  END IF;

  -- Calculate subtotal
  v_subtotal := v_base_price * p_quantity;

  -- Apply group pricing discount if applicable (check if table exists)
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'group_pricing_rules'
  ) THEN
    SELECT COALESCE(MAX(discount_percentage), 0) INTO v_group_discount
    FROM group_pricing_rules
    WHERE ticket_tier_id = p_tier_id
    AND min_quantity <= p_quantity;

    IF v_group_discount > 0 THEN
      v_discount_amount := (v_subtotal * v_group_discount) / 100;
    END IF;
  END IF;

  -- Apply discount code if provided and valid
  IF p_discount_code IS NOT NULL AND p_discount_code != '' THEN
    SELECT
      CASE
        WHEN dc.discount_type = 'percentage'
        THEN (v_subtotal * dc.discount_value) / 100
        ELSE dc.discount_value
      END INTO v_code_discount
    FROM discount_codes dc
    WHERE UPPER(dc.code) = UPPER(p_discount_code)
    AND dc.event_id = v_event_id
    AND (dc.applicable_tiers IS NULL OR p_tier_id = ANY(dc.applicable_tiers))
    AND (dc.usage_limit IS NULL OR dc.usage_count < dc.usage_limit)
    AND NOW() >= dc.valid_from
    AND (dc.valid_until IS NULL OR NOW() < dc.valid_until)
    AND (dc.minimum_purchase_cents IS NULL OR v_subtotal >= dc.minimum_purchase_cents);

    -- Take the better discount (don't stack)
    IF v_code_discount > v_discount_amount THEN
      v_discount_amount := v_code_discount;
    END IF;
  END IF;

  -- Ensure discount doesn't exceed subtotal
  v_discount_amount := LEAST(v_discount_amount, v_subtotal);

  -- Calculate fees (3% platform fee + 2.9% + 30 cents Stripe fee)
  -- Total: 5.9% + 30 cents
  v_fees := ((v_subtotal - v_discount_amount) * 59) / 1000 + 30;

  RETURN QUERY SELECT
    v_subtotal,
    v_discount_amount,
    v_fees,
    v_subtotal - v_discount_amount + v_fees,
    v_currency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION validate_discount_code TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_ticket_price TO authenticated;

-- Grant execute permissions to anon users (for public event pages)
GRANT EXECUTE ON FUNCTION validate_discount_code TO anon;
GRANT EXECUTE ON FUNCTION calculate_ticket_price TO anon;

-- Add helpful comments
COMMENT ON FUNCTION validate_discount_code IS 'Validates if a discount code can be used for an event';
COMMENT ON FUNCTION calculate_ticket_price IS 'Calculates total ticket price including discounts and fees';