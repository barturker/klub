-- Fix migration: Add currency column and other improvements to fee_tiers table

-- Add currency column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fee_tiers'
    AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.fee_tiers
    ADD COLUMN currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'TRY'));
  END IF;
END $$;

-- Drop old index if exists
DROP INDEX IF EXISTS idx_fee_tiers_active;

-- Create new index with currency
CREATE INDEX IF NOT EXISTS idx_fee_tiers_lookup
  ON public.fee_tiers(tier_type, currency, min_amount)
  WHERE is_active = true;

-- Add platform_admins table if not exists
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('super_admin', 'admin', 'support')) NOT NULL DEFAULT 'admin',
  permissions JSONB DEFAULT '{"fee_management": true, "payout_management": true}'::jsonb,
  added_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add audit_logs table if not exists
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record
  ON public.audit_logs(table_name, record_id, changed_at DESC);

-- Update the is_platform_admin function
CREATE OR REPLACE FUNCTION is_platform_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM platform_admins
    WHERE platform_admins.user_id = is_platform_admin.user_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update calculate_platform_fee function with better logic
CREATE OR REPLACE FUNCTION calculate_platform_fee(
  p_ticket_price_cents INTEGER,
  p_currency TEXT DEFAULT 'USD',
  p_payout_schedule_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_fee_tier RECORD;
  v_payout_schedule RECORD;
  v_platform_fee INTEGER;
  v_processing_fee INTEGER;
  v_instant_fee INTEGER := 0;
  v_total_platform_fees INTEGER;
  v_buyer_total INTEGER;
  v_stripe_fee INTEGER;
  v_organizer_net INTEGER;
  v_platform_net_revenue INTEGER;
BEGIN
  -- Get applicable fee tier
  SELECT * INTO v_fee_tier
  FROM fee_tiers
  WHERE tier_type = 'ticket_price'
  AND currency = p_currency
  AND p_ticket_price_cents >= min_amount
  AND (max_amount IS NULL OR p_ticket_price_cents <= max_amount)
  AND is_active = true
  ORDER BY priority DESC
  LIMIT 1;

  -- If no tier found, use default
  IF v_fee_tier IS NULL THEN
    v_platform_fee := ROUND(p_ticket_price_cents * 0.059 + 99);
    v_processing_fee := 0;
  ELSE
    -- Calculate platform fee
    v_platform_fee := ROUND(p_ticket_price_cents * v_fee_tier.platform_fee_percentage + v_fee_tier.platform_fee_fixed);
    v_processing_fee := ROUND(p_ticket_price_cents * v_fee_tier.processing_fee_percentage + v_fee_tier.processing_fee_fixed);
  END IF;

  -- Get payout schedule if specified
  IF p_payout_schedule_id IS NOT NULL THEN
    SELECT * INTO v_payout_schedule
    FROM payout_schedules
    WHERE id = p_payout_schedule_id AND is_active = true;

    IF v_payout_schedule IS NOT NULL THEN
      -- Apply discount for waiting or extra fee for instant
      v_platform_fee := v_platform_fee - ROUND(v_platform_fee * v_payout_schedule.fee_discount_percentage);
      v_instant_fee := v_payout_schedule.extra_fee_amount;
    END IF;
  END IF;

  -- Calculate totals with CORRECT math
  v_total_platform_fees := v_platform_fee + v_processing_fee + v_instant_fee;
  v_buyer_total := p_ticket_price_cents + v_total_platform_fees;

  -- Stripe charges on the total amount buyer pays
  v_stripe_fee := ROUND(v_buyer_total * 0.029 + 30);

  -- Organizer gets ticket price minus platform fees minus Stripe fee
  v_organizer_net := p_ticket_price_cents - v_total_platform_fees - v_stripe_fee;

  -- Platform keeps the platform fees minus Stripe's cut of those fees
  v_platform_net_revenue := v_total_platform_fees - ROUND(v_total_platform_fees * 0.029);

  RETURN json_build_object(
    'ticket_price', p_ticket_price_cents,
    'platform_fee', v_platform_fee,
    'processing_fee', v_processing_fee,
    'instant_payout_fee', v_instant_fee,
    'total_platform_fees', v_total_platform_fees,
    'buyer_total', v_buyer_total,
    'stripe_fee', v_stripe_fee,
    'organizer_net', v_organizer_net,
    'platform_net_revenue', v_platform_net_revenue,
    'fee_tier_name', v_fee_tier.name,
    'fee_percentage', v_fee_tier.platform_fee_percentage
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on new tables
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for platform_admins
DROP POLICY IF EXISTS "Only super admins can manage platform admins" ON public.platform_admins;
CREATE POLICY "Only super admins can manage platform admins" ON public.platform_admins
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM platform_admins pa
    WHERE pa.user_id = auth.uid()
    AND pa.role = 'super_admin'
    AND pa.is_active = true
  )
);

-- Policies for audit_logs
DROP POLICY IF EXISTS "Platform admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Platform admins can view audit logs" ON public.audit_logs
FOR SELECT USING (is_platform_admin(auth.uid()));

-- Trigger for audit logs on fee_tiers
CREATE OR REPLACE FUNCTION audit_fee_tier_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs(table_name, record_id, action, old_data, changed_by)
    VALUES ('fee_tiers', OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs(table_name, record_id, action, old_data, new_data, changed_by)
    VALUES ('fee_tiers', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs(table_name, record_id, action, new_data, changed_by)
    VALUES ('fee_tiers', NEW.id, 'CREATE', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_fee_tier_changes_trigger ON fee_tiers;
CREATE TRIGGER audit_fee_tier_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON fee_tiers
FOR EACH ROW EXECUTE FUNCTION audit_fee_tier_changes();

-- Update existing fee tiers to have currency
UPDATE fee_tiers SET currency = 'USD' WHERE currency IS NULL;