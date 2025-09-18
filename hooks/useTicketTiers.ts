/**
 * TanStack Query hooks for tier data management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type {
  TicketTier,
  TicketTierFormData,
  DiscountCode,
  DiscountCodeFormData,
  GroupPricingRule,
  GroupPricingRuleFormData,
  PriceCalculation,
  DiscountValidation,
} from '@/lib/types/tickets';

const supabase = createClient();

// Query keys
const queryKeys = {
  tiers: (eventId: string) => ['ticket-tiers', eventId] as const,
  tier: (tierId: string) => ['ticket-tier', tierId] as const,
  discounts: (eventId: string) => ['discount-codes', eventId] as const,
  discount: (codeId: string) => ['discount-code', codeId] as const,
  groupPricing: (tierId: string) => ['group-pricing', tierId] as const,
  priceCalculation: (tierId: string, quantity: number, code?: string) =>
    ['price-calculation', tierId, quantity, code] as const,
  discountValidation: (eventId: string, code: string) =>
    ['discount-validation', eventId, code] as const,
};

/**
 * Fetch ticket tiers for an event
 */
export function useTicketTiers(eventId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tiers(eventId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_tiers')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as TicketTier[];
    },
    enabled: !!eventId,
  });
}

/**
 * Fetch single ticket tier
 */
export function useTicketTier(tierId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tier(tierId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_tiers')
        .select('*')
        .eq('id', tierId)
        .single();

      if (error) throw error;
      return data as TicketTier;
    },
    enabled: !!tierId,
  });
}

/**
 * Create ticket tier
 */
export function useCreateTicketTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      data,
    }: {
      eventId: string;
      data: TicketTierFormData;
    }) => {
      const { data: tier, error } = await supabase
        .from('ticket_tiers')
        .insert({
          event_id: eventId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return tier as TicketTier;
    },
    onSuccess: (tier) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tiers(tier.event_id),
      });
    },
  });
}

/**
 * Update ticket tier
 */
export function useUpdateTicketTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tierId,
      data,
    }: {
      tierId: string;
      data: Partial<TicketTierFormData>;
    }) => {
      const { data: tier, error } = await supabase
        .from('ticket_tiers')
        .update(data)
        .eq('id', tierId)
        .select()
        .single();

      if (error) throw error;
      return tier as TicketTier;
    },
    onSuccess: (tier) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tier(tier.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tiers(tier.event_id),
      });
    },
  });
}

/**
 * Delete ticket tier
 */
export function useDeleteTicketTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tierId: string) => {
      // Get the tier first to know which event to invalidate
      const { data: tier } = await supabase
        .from('ticket_tiers')
        .select('event_id')
        .eq('id', tierId)
        .single();

      const { error } = await supabase
        .from('ticket_tiers')
        .delete()
        .eq('id', tierId);

      if (error) throw error;
      return tier?.event_id;
    },
    onSuccess: (eventId) => {
      if (eventId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.tiers(eventId),
        });
      }
    },
  });
}

/**
 * Update ticket tier sort order
 */
export function useUpdateTierOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tierOrders,
    }: {
      eventId: string;
      tierOrders: { id: string; sort_order: number }[];
    }) => {
      // Update each tier's sort order
      const updates = tierOrders.map((order) =>
        supabase
          .from('ticket_tiers')
          .update({ sort_order: order.sort_order })
          .eq('id', order.id)
      );

      const results = await Promise.all(updates);

      // Check for errors
      const error = results.find((r) => r.error)?.error;
      if (error) throw error;

      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tiers(variables.eventId),
      });
    },
  });
}

/**
 * Fetch discount codes for an event
 */
export function useDiscountCodes(eventId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.discounts(eventId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DiscountCode[];
    },
    enabled: !!eventId,
  });
}

/**
 * Create discount code
 */
export function useCreateDiscountCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      data,
    }: {
      eventId: string;
      data: DiscountCodeFormData;
    }) => {
      const { data: code, error } = await supabase
        .from('discount_codes')
        .insert({
          event_id: eventId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return code as DiscountCode;
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.discounts(code.event_id),
      });
    },
  });
}

/**
 * Delete discount code
 */
export function useDeleteDiscountCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (codeId: string) => {
      // Get the code first to know which event to invalidate
      const { data: code } = await supabase
        .from('discount_codes')
        .select('event_id')
        .eq('id', codeId)
        .single();

      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', codeId);

      if (error) throw error;
      return code?.event_id;
    },
    onSuccess: (eventId) => {
      if (eventId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.discounts(eventId),
        });
      }
    },
  });
}

/**
 * Validate discount code
 */
export function useValidateDiscountCode(
  eventId: string | undefined,
  code: string | undefined,
  tierId?: string
) {
  return useQuery({
    queryKey: queryKeys.discountValidation(eventId!, code!),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('validate_discount_code', {
        p_event_id: eventId,
        p_code: code,
        p_tier_id: tierId || null,
      });

      if (error) throw error;
      return data as DiscountValidation;
    },
    enabled: !!eventId && !!code && code.length > 0,
  });
}

/**
 * Fetch group pricing rules for a tier
 */
export function useGroupPricingRules(tierId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.groupPricing(tierId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_pricing_rules')
        .select('*')
        .eq('ticket_tier_id', tierId)
        .order('min_quantity', { ascending: true });

      if (error) throw error;
      return data as GroupPricingRule[];
    },
    enabled: !!tierId,
  });
}

/**
 * Update group pricing rules
 */
export function useUpdateGroupPricingRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tierId,
      rules,
    }: {
      tierId: string;
      rules: GroupPricingRuleFormData[];
    }) => {
      // Delete existing rules
      await supabase
        .from('group_pricing_rules')
        .delete()
        .eq('ticket_tier_id', tierId);

      // Insert new rules if any
      if (rules.length > 0) {
        const { error } = await supabase.from('group_pricing_rules').insert(
          rules.map((rule) => ({
            ticket_tier_id: tierId,
            ...rule,
          }))
        );

        if (error) throw error;
      }

      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupPricing(variables.tierId),
      });
    },
  });
}

/**
 * Calculate ticket price with discounts and fees
 */
export function useCalculatePrice(
  tierId: string | undefined,
  quantity: number,
  discountCode?: string
) {
  return useQuery({
    queryKey: queryKeys.priceCalculation(tierId!, quantity, discountCode),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculate_ticket_price', {
        p_tier_id: tierId,
        p_quantity: quantity,
        p_discount_code: discountCode || null,
      });

      if (error) throw error;
      return data as PriceCalculation;
    },
    enabled: !!tierId && quantity > 0,
  });
}