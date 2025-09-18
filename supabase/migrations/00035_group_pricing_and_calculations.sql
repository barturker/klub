-- Create group_pricing_rules table for bulk purchase discounts
CREATE TABLE group_pricing_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_tier_id UUID REFERENCES ticket_tiers(id) ON DELETE CASCADE NOT NULL,
  min_quantity INTEGER NOT NULL CHECK (min_quantity > 1),
  discount_percentage INTEGER CHECK (discount_percentage BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint to prevent duplicate rules for same quantity
  UNIQUE(ticket_tier_id, min_quantity)
);

-- Create indexes for performance
CREATE INDEX idx_group_pricing_tier ON group_pricing_rules(ticket_tier_id);
CREATE INDEX idx_group_pricing_quantity ON group_pricing_rules(ticket_tier_id, min_quantity DESC);

-- Enable RLS
ALTER TABLE group_pricing_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view group pricing rules for visible tiers
CREATE POLICY "Group pricing viewable with tier"
  ON group_pricing_rules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ticket_tiers tt
      WHERE tt.id = group_pricing_rules.ticket_tier_id
      -- Will use ticket_tiers RLS policies
    )
  );

-- RLS Policy: Event managers can manage group pricing
CREATE POLICY "Event managers can insert group pricing"
  ON group_pricing_rules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ticket_tiers tt
      JOIN events e ON e.id = tt.event_id
      JOIN community_members cm ON cm.community_id = e.community_id
      WHERE tt.id = group_pricing_rules.ticket_tier_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Event managers can update group pricing"
  ON group_pricing_rules
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ticket_tiers tt
      JOIN events e ON e.id = tt.event_id
      JOIN community_members cm ON cm.community_id = e.community_id
      WHERE tt.id = group_pricing_rules.ticket_tier_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ticket_tiers tt
      JOIN events e ON e.id = tt.event_id
      JOIN community_members cm ON cm.community_id = e.community_id
      WHERE tt.id = group_pricing_rules.ticket_tier_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Event managers can delete group pricing"
  ON group_pricing_rules
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ticket_tiers tt
      JOIN events e ON e.id = tt.event_id
      JOIN community_members cm ON cm.community_id = e.community_id
      WHERE tt.id = group_pricing_rules.ticket_tier_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

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
    tt.currency,
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

  -- Apply group pricing discount if applicable
  SELECT COALESCE(MAX(discount_percentage), 0) INTO v_group_discount
  FROM group_pricing_rules
  WHERE ticket_tier_id = p_tier_id
  AND min_quantity <= p_quantity;

  IF v_group_discount > 0 THEN
    v_discount_amount := (v_subtotal * v_group_discount) / 100;
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
$$ LANGUAGE plpgsql;

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
      'Invalid discount code';
    RETURN;
  END IF;

  -- Check if code has expired
  IF v_code_record.valid_until IS NOT NULL AND v_code_record.valid_until <= NOW() THEN
    RETURN QUERY SELECT
      FALSE,
      NULL::TEXT,
      NULL::INTEGER,
      'Discount code has expired';
    RETURN;
  END IF;

  -- Check if code is not yet valid
  IF v_code_record.valid_from > NOW() THEN
    RETURN QUERY SELECT
      FALSE,
      NULL::TEXT,
      NULL::INTEGER,
      'Discount code is not yet valid';
    RETURN;
  END IF;

  -- Check usage limit
  IF v_code_record.usage_limit IS NOT NULL AND v_code_record.usage_count >= v_code_record.usage_limit THEN
    RETURN QUERY SELECT
      FALSE,
      NULL::TEXT,
      NULL::INTEGER,
      'Discount code usage limit reached';
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
      'Discount code not valid for this ticket tier';
    RETURN;
  END IF;

  -- Code is valid
  RETURN QUERY SELECT
    TRUE,
    v_code_record.discount_type,
    v_code_record.discount_value,
    'Discount code is valid';
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE group_pricing_rules IS 'Stores bulk purchase discount rules for ticket tiers';
COMMENT ON FUNCTION calculate_ticket_price IS 'Calculates total ticket price including discounts and fees';
COMMENT ON FUNCTION validate_discount_code IS 'Validates if a discount code can be used';