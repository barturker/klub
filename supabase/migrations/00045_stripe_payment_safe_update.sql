-- Safe update for Stripe payment integration
-- This migration carefully adds missing columns and tables

-- 1. Update orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS buyer_email TEXT,
ADD COLUMN IF NOT EXISTS buyer_name TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Create index only if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders'
    AND column_name = 'stripe_payment_intent_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_orders_stripe_intent ON orders(stripe_payment_intent_id);
  END IF;
END $$;

-- 2. Update tickets table
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS attendee_email TEXT,
ADD COLUMN IF NOT EXISTS attendee_name TEXT,
ADD COLUMN IF NOT EXISTS ticket_code TEXT,
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Make ticket_code unique if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets'
    AND column_name = 'ticket_code'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tickets'
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%ticket_code%'
  ) THEN
    -- First populate any NULL ticket codes
    UPDATE tickets
    SET ticket_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT), 1, 8))
    WHERE ticket_code IS NULL;

    -- Then add unique constraint
    ALTER TABLE tickets ADD CONSTRAINT tickets_ticket_code_unique UNIQUE (ticket_code);
  END IF;

  -- Create index
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets'
    AND column_name = 'ticket_code'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(ticket_code);
  END IF;
END $$;

-- 3. Create Stripe Accounts table (for organizers)
CREATE TABLE IF NOT EXISTS public.stripe_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE UNIQUE NOT NULL,
  stripe_account_id TEXT UNIQUE NOT NULL,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  default_currency TEXT DEFAULT 'USD',
  country TEXT,
  business_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_accounts_community ON stripe_accounts(community_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_stripe_id ON stripe_accounts(stripe_account_id);

-- 4. Create Order items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  ticket_tier_id UUID REFERENCES public.ticket_tiers(id) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  discount_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- 5. Create Payment intents table
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_account_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,
  payment_method_types TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_order ON payment_intents(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_stripe ON payment_intents(stripe_payment_intent_id);

-- 6. Enable RLS on new tables
ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies (check if they don't exist first)
DO $$
BEGIN
  -- Stripe accounts policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'stripe_accounts'
    AND policyname = 'Community admins can manage Stripe accounts'
  ) THEN
    CREATE POLICY "Community admins can manage Stripe accounts"
    ON stripe_accounts FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = stripe_accounts.community_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
      )
    );
  END IF;
END $$;

-- Order items policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'order_items'
    AND policyname = 'Users can view order items for their orders'
  ) THEN
    CREATE POLICY "Users can view order items for their orders"
    ON order_items FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = order_items.order_id
        AND (o.buyer_id = auth.uid() OR EXISTS (
          SELECT 1 FROM events e
          JOIN community_members cm ON cm.community_id = e.community_id
          WHERE e.id = o.event_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('admin', 'moderator')
        ))
      )
    );
  END IF;
END $$;

-- Payment intents policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payment_intents'
    AND policyname = 'Users can view payment intents for their orders'
  ) THEN
    CREATE POLICY "Users can view payment intents for their orders"
    ON payment_intents FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = payment_intents.order_id
        AND o.buyer_id = auth.uid()
      )
    );
  END IF;
END $$;

-- 8. Utility functions

-- Generate unique ticket codes
CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character code
    code := 'TKT' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));

    -- Check if it already exists
    SELECT EXISTS(SELECT 1 FROM tickets WHERE ticket_code = code) INTO exists;

    -- If it doesn't exist, we can use it
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Calculate platform fees (3% for Klub)
CREATE OR REPLACE FUNCTION calculate_platform_fee(amount_cents INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN CEIL(amount_cents * 0.03);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate Stripe fees (2.9% + $0.30)
CREATE OR REPLACE FUNCTION calculate_stripe_fee(amount_cents INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN CEIL(amount_cents * 0.029) + 30;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate total fees
CREATE OR REPLACE FUNCTION calculate_total_fees(amount_cents INTEGER)
RETURNS TABLE (
  platform_fee INTEGER,
  stripe_fee INTEGER,
  total_fee INTEGER,
  net_amount INTEGER
) AS $$
DECLARE
  p_fee INTEGER;
  s_fee INTEGER;
BEGIN
  p_fee := calculate_platform_fee(amount_cents);
  s_fee := calculate_stripe_fee(amount_cents);

  RETURN QUERY SELECT
    p_fee AS platform_fee,
    s_fee AS stripe_fee,
    (p_fee + s_fee) AS total_fee,
    (amount_cents - p_fee - s_fee) AS net_amount;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9. Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_stripe_accounts_updated_at'
  ) THEN
    CREATE TRIGGER update_stripe_accounts_updated_at
    BEFORE UPDATE ON stripe_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_payment_intents_updated_at'
  ) THEN
    CREATE TRIGGER update_payment_intents_updated_at
    BEFORE UPDATE ON payment_intents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 10. Add helpful comments
COMMENT ON TABLE public.orders IS 'Order table for Stripe payments - TEST MODE: Use test card 4242424242424242';
COMMENT ON TABLE public.stripe_accounts IS 'Stripe Connect accounts - TEST MODE: Accounts will have acct_test_ prefix';
COMMENT ON TABLE public.payment_intents IS 'Payment tracking - TEST MODE: Intent IDs will have pi_test_ prefix';
COMMENT ON FUNCTION generate_ticket_code() IS 'Generates unique ticket codes with TKT prefix';
COMMENT ON FUNCTION calculate_total_fees(INTEGER) IS 'Calculates all fees: platform (3%), Stripe (2.9% + 30¢)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Stripe payment tables created successfully!';
  RAISE NOTICE 'TEST MODE: Use test cards like 4242424242424242';
  RAISE NOTICE 'Platform fee: 3 percent, Stripe fee: 2.9 percent plus 30 cents';
END $$;