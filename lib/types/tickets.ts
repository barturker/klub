/**
 * Ticket Pricing & Tiers Type Definitions
 */

export type Currency = 'USD' | 'EUR' | 'GBP' | 'TRY' | 'JPY';
export type DiscountType = 'percentage' | 'fixed';

export interface TicketTier {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: Currency;
  quantity_available: number | null;
  quantity_sold: number;
  sales_start: string | null;
  sales_end: string | null;
  min_per_order: number;
  max_per_order: number;
  is_hidden: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DiscountCode {
  id: string;
  event_id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  applicable_tiers: string[] | null;
  usage_limit: number | null;
  usage_count: number;
  valid_from: string;
  valid_until: string | null;
  minimum_purchase_cents: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
}

export interface GroupPricingRule {
  id: string;
  ticket_tier_id: string;
  min_quantity: number;
  discount_percentage: number;
  created_at: string;
}

export interface PriceCalculation {
  subtotal_cents: number;
  discount_cents: number;
  fees_cents: number;
  total_cents: number;
  currency: Currency;
}

export interface DiscountValidation {
  is_valid: boolean;
  discount_type: DiscountType | null;
  discount_value: number | null;
  message: string;
}

// Form types for creating/updating
export interface TicketTierFormData {
  name: string;
  description?: string;
  price_cents: number;
  currency: Currency;
  quantity_available?: number;
  sales_start?: Date | null;
  sales_end?: Date | null;
  min_per_order: number;
  max_per_order: number;
  is_hidden: boolean;
}

export interface DiscountCodeFormData {
  code: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  applicable_tiers?: string[];
  usage_limit?: number;
  valid_until?: Date | null;
  minimum_purchase_cents?: number;
}

export interface GroupPricingRuleFormData {
  min_quantity: number;
  discount_percentage: number;
}

// Ticket policies
export interface TicketPolicies {
  refund_allowed: boolean;
  refund_deadline_hours?: number;
  transfer_allowed: boolean;
  transfer_deadline_hours?: number;
  change_allowed: boolean;
}

// Event with ticket configuration
export interface EventWithTickets {
  id: string;
  name: string;
  slug: string;
  ticket_tiers?: TicketTier[];
  discount_codes?: DiscountCode[];
  policies?: TicketPolicies;
}