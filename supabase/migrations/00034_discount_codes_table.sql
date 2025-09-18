-- Create discount_codes table for event discount management
CREATE TABLE discount_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')) NOT NULL,
  discount_value INTEGER NOT NULL CHECK (
    (discount_type = 'percentage' AND discount_value BETWEEN 0 AND 100) OR
    (discount_type = 'fixed' AND discount_value >= 0)
  ),
  applicable_tiers UUID[] DEFAULT NULL, -- NULL means all tiers
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  minimum_purchase_cents INTEGER CHECK (minimum_purchase_cents IS NULL OR minimum_purchase_cents > 0),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Ensure unique codes per event
  UNIQUE(event_id, code),

  -- Ensure valid date range
  CONSTRAINT check_validity_window CHECK (
    valid_until IS NULL OR
    valid_until > valid_from
  ),

  -- Ensure usage doesn't exceed limit
  CONSTRAINT check_usage CHECK (
    usage_limit IS NULL OR
    usage_count <= usage_limit
  )
);

-- Create indexes for performance
CREATE INDEX idx_discount_codes_event ON discount_codes(event_id);
CREATE INDEX idx_discount_codes_code ON discount_codes(UPPER(code));
CREATE INDEX idx_discount_codes_validity ON discount_codes(valid_from, valid_until)
  WHERE valid_until IS NOT NULL;
-- Index for active codes (without NOW() which isn't immutable)
CREATE INDEX idx_discount_codes_active ON discount_codes(event_id, code)
  WHERE (usage_limit IS NULL OR usage_count < usage_limit);

-- Enable RLS
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Valid discount codes are viewable
CREATE POLICY "Active discount codes are viewable"
  ON discount_codes
  FOR SELECT
  USING (
    -- Code must be currently valid
    NOW() >= valid_from AND
    (valid_until IS NULL OR valid_until > NOW()) AND
    (usage_limit IS NULL OR usage_count < usage_limit)
  );

-- RLS Policy: Event managers can manage discount codes
CREATE POLICY "Event managers can insert discount codes"
  ON discount_codes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      JOIN community_members cm ON cm.community_id = e.community_id
      WHERE e.id = discount_codes.event_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Event managers can update discount codes"
  ON discount_codes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN community_members cm ON cm.community_id = e.community_id
      WHERE e.id = discount_codes.event_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      JOIN community_members cm ON cm.community_id = e.community_id
      WHERE e.id = discount_codes.event_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Event managers can delete discount codes"
  ON discount_codes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN community_members cm ON cm.community_id = e.community_id
      WHERE e.id = discount_codes.event_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

-- Function to increment discount code usage atomically
CREATE OR REPLACE FUNCTION increment_discount_usage(p_code_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE discount_codes
  SET usage_count = usage_count + 1
  WHERE id = p_code_id
  AND (usage_limit IS NULL OR usage_count < usage_limit)
  AND NOW() >= valid_from
  AND (valid_until IS NULL OR valid_until > NOW());

  v_updated := FOUND;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE discount_codes IS 'Stores discount codes for event ticket purchases';
COMMENT ON COLUMN discount_codes.discount_value IS 'Percentage (0-100) or fixed amount in minor currency units';
COMMENT ON COLUMN discount_codes.applicable_tiers IS 'Array of tier IDs this code applies to, NULL for all tiers';
COMMENT ON COLUMN discount_codes.minimum_purchase_cents IS 'Minimum purchase amount required for discount to apply';