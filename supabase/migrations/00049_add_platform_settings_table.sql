-- Migration: Platform Settings for Dynamic Fee Management
-- Admin dashboard ile yönetilebilir komisyon sistemi

-- =============================================
-- PLATFORM SETTINGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  setting_type TEXT CHECK (setting_type IN ('fee', 'payout', 'general', 'feature')) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON public.platform_settings(setting_key) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_platform_settings_type ON public.platform_settings(setting_type);

-- =============================================
-- FEE TIERS TABLE (Dinamik komisyon katmanları)
-- =============================================

CREATE TABLE IF NOT EXISTS public.fee_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tier_type TEXT CHECK (tier_type IN ('ticket_price', 'event_size', 'organizer_volume')) NOT NULL,
  min_amount INTEGER NOT NULL, -- cents veya adet
  max_amount INTEGER, -- NULL = sınırsız
  platform_fee_percentage DECIMAL(4,3) NOT NULL, -- 0.000 to 9.999 (0% - 99.9%)
  platform_fee_fixed INTEGER NOT NULL DEFAULT 0, -- Fixed fee in cents
  processing_fee_percentage DECIMAL(4,3) DEFAULT 0,
  processing_fee_fixed INTEGER DEFAULT 0,
  instant_payout_fee INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0, -- Öncelik sırası
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fee_tiers_active ON public.fee_tiers(tier_type, min_amount) WHERE is_active = true;

-- =============================================
-- PAYOUT SCHEDULES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.payout_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  schedule_type TEXT CHECK (schedule_type IN ('instant', 'daily', 'weekly', 'biweekly', 'monthly', 'after_event')) NOT NULL,
  days_delay INTEGER DEFAULT 0, -- Kaç gün sonra
  fee_discount_percentage DECIMAL(4,3) DEFAULT 0, -- Beklemeye göre indirim
  extra_fee_amount INTEGER DEFAULT 0, -- Instant için extra ücret
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DEFAULT SETTINGS INSERT
-- =============================================

-- Genel platform ayarları
INSERT INTO platform_settings (setting_key, setting_value, setting_type, description) VALUES
  ('default_platform_fee', '{"percentage": 0.059, "fixed": 99}'::jsonb, 'fee', 'Default platform fee: 5.9% + $0.99'),
  ('stripe_fee', '{"percentage": 0.029, "fixed": 30}'::jsonb, 'fee', 'Stripe processing fee: 2.9% + $0.30'),
  ('fee_bearer', '{"type": "buyer"}'::jsonb, 'fee', 'Who pays the fees: buyer or organizer'),
  ('instant_payout_enabled', '{"enabled": true, "fee": 300}'::jsonb, 'payout', 'Instant payout: enabled with $3 fee'),
  ('refund_policy_default', '{"hours_before": 24, "percentage": 100}'::jsonb, 'general', 'Default refund policy'),
  ('max_ticket_price', '{"amount": 1000000}'::jsonb, 'general', 'Max ticket price: $10,000'),
  ('min_ticket_price', '{"amount": 100}'::jsonb, 'general', 'Min ticket price: $1.00')
ON CONFLICT (setting_key) DO NOTHING;

-- Progressive fee tiers (ticket fiyatına göre)
INSERT INTO fee_tiers (name, tier_type, min_amount, max_amount, platform_fee_percentage, platform_fee_fixed, priority) VALUES
  ('Micro Events', 'ticket_price', 0, 1000, 0.079, 50, 1),           -- $0-10: 7.9% + $0.50
  ('Small Events', 'ticket_price', 1001, 5000, 0.069, 75, 2),       -- $10-50: 6.9% + $0.75
  ('Medium Events', 'ticket_price', 5001, 20000, 0.059, 99, 3),     -- $50-200: 5.9% + $0.99
  ('Large Events', 'ticket_price', 20001, 100000, 0.049, 149, 4),   -- $200-1000: 4.9% + $1.49
  ('Premium Events', 'ticket_price', 100001, NULL, 0.039, 199, 5)   -- $1000+: 3.9% + $1.99
ON CONFLICT DO NOTHING;

-- Payout schedules
INSERT INTO payout_schedules (name, schedule_type, days_delay, fee_discount_percentage, extra_fee_amount, is_default) VALUES
  ('Instant Payout', 'instant', 0, 0, 300, false),          -- No discount, $3 extra
  ('Daily Payout', 'daily', 1, 0.005, 0, false),            -- 0.5% discount
  ('Weekly Payout', 'weekly', 7, 0.010, 0, true),           -- 1% discount (default)
  ('After Event', 'after_event', 0, 0.020, 0, false)        -- 2% discount
ON CONFLICT DO NOTHING;

-- =============================================
-- ADMIN CHECK FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION is_platform_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Platform admin kontrolü (email bazlı veya role bazlı)
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND (
      email IN ('admin@klub.com', 'zimba@klub.com') -- Admin emailleri
      OR metadata->>'role' = 'platform_admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- DYNAMIC FEE CALCULATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION calculate_platform_fee(
  p_ticket_price_cents INTEGER,
  p_payout_schedule_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_fee_tier RECORD;
  v_payout_schedule RECORD;
  v_platform_fee INTEGER;
  v_processing_fee INTEGER;
  v_instant_fee INTEGER := 0;
  v_total_fees INTEGER;
  v_organizer_net INTEGER;
BEGIN
  -- Get applicable fee tier
  SELECT * INTO v_fee_tier
  FROM fee_tiers
  WHERE tier_type = 'ticket_price'
  AND p_ticket_price_cents >= min_amount
  AND (max_amount IS NULL OR p_ticket_price_cents <= max_amount)
  AND is_active = true
  ORDER BY priority DESC
  LIMIT 1;

  -- Calculate platform fee
  v_platform_fee := ROUND(p_ticket_price_cents * v_fee_tier.platform_fee_percentage + v_fee_tier.platform_fee_fixed);
  v_processing_fee := ROUND(p_ticket_price_cents * v_fee_tier.processing_fee_percentage + v_fee_tier.processing_fee_fixed);

  -- Get payout schedule if specified
  IF p_payout_schedule_id IS NOT NULL THEN
    SELECT * INTO v_payout_schedule
    FROM payout_schedules
    WHERE id = p_payout_schedule_id AND is_active = true;

    -- Apply discount or extra fee
    v_platform_fee := v_platform_fee - ROUND(v_platform_fee * v_payout_schedule.fee_discount_percentage);
    v_instant_fee := v_payout_schedule.extra_fee_amount;
  END IF;

  v_total_fees := v_platform_fee + v_processing_fee + v_instant_fee;
  v_organizer_net := p_ticket_price_cents - ROUND((p_ticket_price_cents + v_total_fees) * 0.029 + 30); -- Stripe fee

  RETURN json_build_object(
    'ticket_price', p_ticket_price_cents,
    'platform_fee', v_platform_fee,
    'processing_fee', v_processing_fee,
    'instant_payout_fee', v_instant_fee,
    'total_fees', v_total_fees,
    'buyer_total', p_ticket_price_cents + v_total_fees,
    'organizer_net', v_organizer_net,
    'fee_tier_name', v_fee_tier.name,
    'fee_percentage', v_fee_tier.platform_fee_percentage
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_schedules ENABLE ROW LEVEL SECURITY;

-- Only platform admins can modify settings
CREATE POLICY "Platform admins can manage settings" ON public.platform_settings
FOR ALL USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can manage fee tiers" ON public.fee_tiers
FOR ALL USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can manage payout schedules" ON public.payout_schedules
FOR ALL USING (is_platform_admin(auth.uid()));

-- Everyone can read active settings
CREATE POLICY "Public can view active settings" ON public.platform_settings
FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view active fee tiers" ON public.fee_tiers
FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view active payout schedules" ON public.payout_schedules
FOR SELECT USING (is_active = true);

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_tiers_updated_at
  BEFORE UPDATE ON public.fee_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();