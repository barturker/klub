-- Create ticket_tiers table for event ticket pricing and configuration
CREATE TABLE ticket_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'TRY', 'JPY')),
  quantity_available INTEGER CHECK (quantity_available IS NULL OR quantity_available > 0),
  quantity_sold INTEGER DEFAULT 0 CHECK (quantity_sold >= 0),
  sales_start TIMESTAMPTZ,
  sales_end TIMESTAMPTZ,
  min_per_order INTEGER DEFAULT 1 CHECK (min_per_order > 0),
  max_per_order INTEGER DEFAULT 10 CHECK (max_per_order > 0),
  is_hidden BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure max >= min for order quantities
  CONSTRAINT check_order_quantities CHECK (max_per_order >= min_per_order),
  -- Ensure sales window is valid
  CONSTRAINT check_sales_window CHECK (
    sales_end IS NULL OR
    sales_start IS NULL OR
    sales_end > sales_start
  ),
  -- Ensure quantity sold doesn't exceed available
  CONSTRAINT check_quantity CHECK (
    quantity_available IS NULL OR
    quantity_sold <= quantity_available
  )
);

-- Create indexes for performance
CREATE INDEX idx_ticket_tiers_event ON ticket_tiers(event_id);
CREATE INDEX idx_ticket_tiers_sort ON ticket_tiers(event_id, sort_order);
CREATE INDEX idx_ticket_tiers_sales ON ticket_tiers(sales_start, sales_end)
  WHERE sales_start IS NOT NULL OR sales_end IS NOT NULL;

-- Enable RLS
ALTER TABLE ticket_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view ticket tiers for published events
CREATE POLICY "Ticket tiers viewable for published events"
  ON ticket_tiers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_tiers.event_id
      AND events.status = 'published'
    ) OR EXISTS (
      -- Community admins/moderators can always view
      SELECT 1 FROM events e
      JOIN community_members cm ON cm.community_id = e.community_id
      WHERE e.id = ticket_tiers.event_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

-- RLS Policy: Event managers can manage ticket tiers
CREATE POLICY "Event managers can insert ticket tiers"
  ON ticket_tiers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      JOIN community_members cm ON cm.community_id = e.community_id
      WHERE e.id = ticket_tiers.event_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Event managers can update ticket tiers"
  ON ticket_tiers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN community_members cm ON cm.community_id = e.community_id
      WHERE e.id = ticket_tiers.event_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      JOIN community_members cm ON cm.community_id = e.community_id
      WHERE e.id = ticket_tiers.event_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Event managers can delete ticket tiers"
  ON ticket_tiers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN community_members cm ON cm.community_id = e.community_id
      WHERE e.id = ticket_tiers.event_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ticket_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_tiers_updated_at
  BEFORE UPDATE ON ticket_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_tiers_updated_at();

-- Add comment for documentation
COMMENT ON TABLE ticket_tiers IS 'Stores ticket tier configurations for events including pricing, availability, and sales windows';
COMMENT ON COLUMN ticket_tiers.price_cents IS 'Price in minor currency units (cents for USD, kuruş for TRY, etc.)';
COMMENT ON COLUMN ticket_tiers.quantity_available IS 'NULL means unlimited availability';
COMMENT ON COLUMN ticket_tiers.metadata IS 'Additional configuration like refund policies, transfer rules, etc.';