-- Migration: Add refund management tables for order processing
-- STORY-011: Order Management & Refunds

-- =============================================
-- ENUM TYPES
-- =============================================

-- Create refund_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_status') THEN
    CREATE TYPE refund_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'cancelled');
  END IF;
END $$;

-- Create refund_reason enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_reason') THEN
    CREATE TYPE refund_reason AS ENUM ('requested_by_customer', 'duplicate', 'fraudulent', 'event_cancelled', 'other');
  END IF;
END $$;

-- Create modification_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'modification_type') THEN
    CREATE TYPE modification_type AS ENUM ('upgrade', 'downgrade', 'transfer', 'cancel', 'modify', 'partial_refund');
  END IF;
END $$;

-- Create export_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_type') THEN
    CREATE TYPE export_type AS ENUM ('csv', 'excel', 'pdf', 'json');
  END IF;
END $$;

-- Create export_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_status') THEN
    CREATE TYPE export_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'expired');
  END IF;
END $$;

-- =============================================
-- REFUNDS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  stripe_refund_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  fee_refund_cents INTEGER DEFAULT 0, -- Platform fee refund
  reason refund_reason NOT NULL,
  reason_details TEXT,
  status refund_status DEFAULT 'pending'::refund_status,
  processed_by UUID REFERENCES profiles(id),
  stripe_webhook_id TEXT, -- Track webhook for idempotency
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for refunds
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_stripe_refund_id ON public.refunds(stripe_refund_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_order_status ON public.refunds(order_id, status);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON public.refunds(created_at DESC);

-- =============================================
-- ORDER MODIFICATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.order_modifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  type modification_type NOT NULL,
  old_values JSONB NOT NULL, -- Store previous state
  new_values JSONB NOT NULL, -- Store new state
  price_difference_cents INTEGER DEFAULT 0,
  stripe_payment_intent_id TEXT, -- For upgrades requiring payment
  reason TEXT,
  modified_by UUID REFERENCES profiles(id) NOT NULL,
  ip_address INET, -- For audit trail
  user_agent TEXT, -- For audit trail
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for order_modifications
CREATE INDEX IF NOT EXISTS idx_order_mods_order_id ON public.order_modifications(order_id);
CREATE INDEX IF NOT EXISTS idx_order_mods_order_created ON public.order_modifications(order_id, created_at DESC);

-- =============================================
-- REFUND POLICIES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.refund_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE UNIQUE NOT NULL,
  deadline_hours INTEGER DEFAULT 24 CHECK (deadline_hours >= 0), -- hours before event
  refund_percentage INTEGER DEFAULT 100 CHECK (refund_percentage BETWEEN 0 AND 100), -- percentage refundable
  no_refund_after TIMESTAMPTZ,
  allow_transfers BOOLEAN DEFAULT TRUE,
  transfer_deadline_hours INTEGER DEFAULT 6 CHECK (transfer_deadline_hours >= 0),
  transfer_fee_cents INTEGER DEFAULT 0, -- Optional transfer fee
  cancellation_policy TEXT,
  policy_version INTEGER DEFAULT 1, -- Track policy changes
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for refund_policies
CREATE INDEX IF NOT EXISTS idx_refund_policies_event_id ON public.refund_policies(event_id) WHERE event_id IS NOT NULL;

-- =============================================
-- ORDER EXPORTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.order_exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  export_type export_type DEFAULT 'csv'::export_type,
  filters JSONB DEFAULT '{}', -- Store applied filters
  columns TEXT[] DEFAULT ARRAY['order_id', 'buyer_name', 'amount', 'status', 'created_at'], -- Selected columns
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,
  file_url TEXT,
  file_size_bytes INTEGER,
  row_count INTEGER,
  status export_status DEFAULT 'pending'::export_status,
  error_message TEXT,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  requested_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for order_exports
CREATE INDEX IF NOT EXISTS idx_exports_community_id ON public.order_exports(community_id);
CREATE INDEX IF NOT EXISTS idx_exports_community_status ON public.order_exports(community_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exports_expires ON public.order_exports(expires_at) WHERE status = 'completed';

-- =============================================
-- HELPER TABLES
-- =============================================

-- Email queue for notifications
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_user_id UUID REFERENCES profiles(id),
  to_email TEXT,
  template_type TEXT NOT NULL,
  template_data JSONB DEFAULT '{}',
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status, priority, created_at);

-- System logs for audit trail
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs(level, created_at DESC);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Refunds policies
DROP POLICY IF EXISTS "Event managers can manage refunds" ON public.refunds;
CREATE POLICY "Event managers can manage refunds"
ON public.refunds FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN events e ON e.id = o.event_id
    JOIN community_members cm ON cm.community_id = e.community_id
    WHERE o.id = refunds.order_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'moderator')
  )
);

DROP POLICY IF EXISTS "Buyers can view own refunds" ON public.refunds;
CREATE POLICY "Buyers can view own refunds"
ON public.refunds FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = refunds.order_id
    AND o.buyer_id = auth.uid()
  )
);

-- Order modifications policies
DROP POLICY IF EXISTS "Event managers can manage order modifications" ON public.order_modifications;
CREATE POLICY "Event managers can manage order modifications"
ON public.order_modifications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN events e ON e.id = o.event_id
    JOIN community_members cm ON cm.community_id = e.community_id
    WHERE o.id = order_modifications.order_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'moderator')
  )
);

-- Refund policies policies
DROP POLICY IF EXISTS "Event managers can manage refund policies" ON public.refund_policies;
CREATE POLICY "Event managers can manage refund policies"
ON public.refund_policies FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN community_members cm ON cm.community_id = e.community_id
    WHERE e.id = refund_policies.event_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'moderator')
  )
);

DROP POLICY IF EXISTS "Public can view refund policies" ON public.refund_policies;
CREATE POLICY "Public can view refund policies"
ON public.refund_policies FOR SELECT
USING (true);

-- Order exports policies
DROP POLICY IF EXISTS "Community managers can manage exports" ON public.order_exports;
CREATE POLICY "Community managers can manage exports"
ON public.order_exports FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = order_exports.community_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'moderator')
  )
);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to process refund with validation
CREATE OR REPLACE FUNCTION process_refund(
  p_order_id UUID,
  p_amount_cents INTEGER,
  p_reason refund_reason,
  p_reason_details TEXT DEFAULT NULL,
  p_stripe_refund_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_refund_id UUID;
  v_order_amount INTEGER;
  v_total_refunded INTEGER;
  v_policy RECORD;
  v_hours_until_event NUMERIC;
  v_allowed_percentage INTEGER;
BEGIN
  -- Get order amount
  SELECT amount_cents INTO v_order_amount
  FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Check existing refunds
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_refunded
  FROM refunds
  WHERE order_id = p_order_id
  AND status = 'succeeded';

  -- Validate refund amount
  IF v_total_refunded + p_amount_cents > v_order_amount THEN
    RAISE EXCEPTION 'Refund amount exceeds order total';
  END IF;

  -- Check refund policy
  SELECT rp.*, EXTRACT(EPOCH FROM (e.start_at - NOW()))/3600 AS hours_until
  INTO v_policy
  FROM refund_policies rp
  JOIN orders o ON o.event_id = rp.event_id
  JOIN events e ON e.id = o.event_id
  WHERE o.id = p_order_id;

  IF FOUND THEN
    v_hours_until_event := v_policy.hours_until;

    -- Check if past no-refund deadline
    IF v_policy.no_refund_after IS NOT NULL AND NOW() > v_policy.no_refund_after THEN
      RAISE EXCEPTION 'Refund deadline has passed';
    END IF;

    -- Calculate allowed refund percentage based on policy
    IF v_hours_until_event < v_policy.deadline_hours THEN
      v_allowed_percentage := v_policy.refund_percentage;
      IF v_allowed_percentage < 100 THEN
        p_amount_cents := LEAST(p_amount_cents, (v_order_amount * v_allowed_percentage / 100)::INTEGER);
      END IF;
    END IF;
  END IF;

  -- Create refund record
  INSERT INTO refunds (
    order_id,
    amount_cents,
    fee_refund_cents,
    reason,
    reason_details,
    stripe_refund_id,
    processed_by,
    status
  ) VALUES (
    p_order_id,
    p_amount_cents,
    ROUND(p_amount_cents * 0.059 + 30), -- Refund proportional platform fee
    p_reason,
    p_reason_details,
    p_stripe_refund_id,
    auth.uid(),
    CASE WHEN p_stripe_refund_id IS NOT NULL THEN 'processing'::refund_status ELSE 'pending'::refund_status END
  ) RETURNING id INTO v_refund_id;

  -- Log modification
  INSERT INTO order_modifications (
    order_id,
    type,
    old_values,
    new_values,
    price_difference_cents,
    reason,
    modified_by
  ) VALUES (
    p_order_id,
    CASE
      WHEN p_amount_cents >= v_order_amount THEN 'cancel'::modification_type
      ELSE 'partial_refund'::modification_type
    END,
    jsonb_build_object('status', (SELECT status FROM orders WHERE id = p_order_id)),
    jsonb_build_object('status', CASE
      WHEN v_total_refunded + p_amount_cents >= v_order_amount THEN 'refunded'
      ELSE 'partially_refunded'
    END),
    -p_amount_cents,
    p_reason::TEXT,
    auth.uid()
  );

  -- Update order status
  UPDATE orders
  SET status = CASE
    WHEN v_total_refunded + p_amount_cents >= v_order_amount THEN 'refunded'::order_status
    ELSE 'partially_refunded'::order_status
  END,
  refunded_at = NOW(),
  updated_at = NOW()
  WHERE id = p_order_id;

  -- Update tickets status
  IF p_amount_cents >= v_order_amount THEN
    UPDATE tickets
    SET status = 'refunded',
        updated_at = NOW()
    WHERE order_id = p_order_id
    AND status IN ('valid', 'used');
  END IF;

  RETURN v_refund_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk refund for cancelled event with progress tracking
CREATE OR REPLACE FUNCTION refund_cancelled_event(
  p_event_id UUID,
  p_notify_customers BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
  refund_count INTEGER,
  total_amount_cents INTEGER,
  failed_orders UUID[]
) AS $$
DECLARE
  v_refund_count INTEGER := 0;
  v_total_amount INTEGER := 0;
  v_failed_orders UUID[] := ARRAY[]::UUID[];
  v_order RECORD;
  v_refund_id UUID;
BEGIN
  -- First, update event status
  UPDATE events
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_event_id;

  -- Process each order
  FOR v_order IN
    SELECT id, amount_cents, buyer_id, stripe_payment_intent_id
    FROM orders
    WHERE event_id = p_event_id
    AND status IN ('paid', 'processing')
    ORDER BY created_at DESC
  LOOP
    BEGIN
      -- Process refund
      v_refund_id := process_refund(
        v_order.id,
        v_order.amount_cents,
        'event_cancelled'::refund_reason,
        'Event was cancelled by organizer'
      );

      v_refund_count := v_refund_count + 1;
      v_total_amount := v_total_amount + v_order.amount_cents;

      -- Queue email notification if requested
      IF p_notify_customers THEN
        INSERT INTO email_queue (
          to_user_id,
          template_type,
          template_data,
          priority
        ) VALUES (
          v_order.buyer_id,
          'event_cancelled',
          jsonb_build_object(
            'event_id', p_event_id,
            'order_id', v_order.id,
            'refund_amount', v_order.amount_cents
          ),
          'high'
        );
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Log failed refund
      v_failed_orders := array_append(v_failed_orders, v_order.id);

      -- Log error
      INSERT INTO system_logs (
        level,
        message,
        context,
        error_details
      ) VALUES (
        'error',
        'Failed to refund order for cancelled event',
        jsonb_build_object(
          'event_id', p_event_id,
          'order_id', v_order.id
        ),
        SQLERRM
      );
    END;
  END LOOP;

  RETURN QUERY SELECT v_refund_count, v_total_amount, v_failed_orders;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to transfer ticket to another user
CREATE OR REPLACE FUNCTION transfer_ticket(
  p_ticket_id UUID,
  p_new_email TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_new_user_id UUID;
  v_new_ticket_id UUID;
  v_order_id UUID;
  v_event_id UUID;
  v_policy RECORD;
  v_ticket_info RECORD;
BEGIN
  -- Get ticket details
  SELECT t.order_id, t.user_id, t.amount_cents, o.event_id
  INTO v_ticket_info
  FROM tickets t
  JOIN orders o ON o.id = t.order_id
  WHERE t.id = p_ticket_id
  AND t.status = 'valid';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Valid ticket not found';
  END IF;

  v_order_id := v_ticket_info.order_id;
  v_event_id := v_ticket_info.event_id;

  -- Check transfer policy
  SELECT * INTO v_policy
  FROM refund_policies
  WHERE event_id = v_event_id;

  IF FOUND AND NOT v_policy.allow_transfers THEN
    RAISE EXCEPTION 'Transfers not allowed for this event';
  END IF;

  -- Get or create user for new email
  SELECT id INTO v_new_user_id
  FROM profiles
  WHERE email = p_new_email;

  IF NOT FOUND THEN
    -- Create placeholder profile
    INSERT INTO profiles (id, email, display_name)
    VALUES (gen_random_uuid(), p_new_email, split_part(p_new_email, '@', 1))
    RETURNING id INTO v_new_user_id;
  END IF;

  -- Create new ticket
  INSERT INTO tickets (
    order_id,
    user_id,
    ticket_number,
    amount_cents,
    status,
    metadata
  )
  VALUES (
    v_order_id,
    v_new_user_id,
    'T-' || gen_random_uuid()::TEXT,
    v_ticket_info.amount_cents,
    'valid',
    jsonb_build_object(
      'transferred_from', p_ticket_id,
      'transfer_date', NOW(),
      'transfer_reason', p_reason
    )
  )
  RETURNING id INTO v_new_ticket_id;

  -- Invalidate old ticket
  UPDATE tickets
  SET status = 'transferred',
      metadata = metadata || jsonb_build_object(
        'transferred_to', v_new_ticket_id,
        'transfer_date', NOW()
      ),
      updated_at = NOW()
  WHERE id = p_ticket_id;

  -- Log modification
  INSERT INTO order_modifications (
    order_id,
    type,
    old_values,
    new_values,
    reason,
    modified_by
  ) VALUES (
    v_order_id,
    'transfer'::modification_type,
    jsonb_build_object('ticket_id', p_ticket_id, 'owner_id', v_ticket_info.user_id),
    jsonb_build_object(
      'new_ticket_id', v_new_ticket_id,
      'new_owner_email', p_new_email,
      'new_owner_id', v_new_user_id
    ),
    p_reason,
    auth.uid()
  );

  RETURN v_new_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp
CREATE TRIGGER update_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refund_policies_updated_at
  BEFORE UPDATE ON public.refund_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VALIDATION
-- =============================================

-- Add check constraint to ensure stripe_session_id exists in orders table (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders'
    AND column_name = 'stripe_session_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN stripe_session_id TEXT UNIQUE;
  END IF;
END $$;

-- Validate that partially_refunded status exists in order_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'partially_refunded'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'partially_refunded' AFTER 'refunded';
  END IF;
END $$;

-- Validate that transferred status exists in ticket_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'transferred'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ticket_status')
  ) THEN
    ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'transferred' AFTER 'refunded';
  END IF;
END $$;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Migration adds support for:
-- 1. Full and partial refunds with Stripe integration
-- 2. Order modifications tracking
-- 3. Refund policies per event
-- 4. Order exports for accounting
-- 5. Email queue for notifications
-- 6. System logs for audit trail
-- 7. Ticket transfers between users
-- 8. Bulk refunds for cancelled events