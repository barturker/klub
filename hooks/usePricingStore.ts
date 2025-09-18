/**
 * Zustand store for pricing state and calculations
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  Currency,
  TicketTier,
  GroupPricingRule,
} from '@/lib/types/tickets';

interface SelectedTicket {
  tierId: string;
  tierName: string;
  quantity: number;
  pricePerTicket: number;
  subtotal: number;
}

interface PricingState {
  // Selected tickets
  selectedTickets: Map<string, SelectedTicket>;

  // Applied discount
  discountCode: string | null;
  discountValidation: {
    isValid: boolean;
    type: 'percentage' | 'fixed' | null;
    value: number | null;
    message: string | null;
  } | null;

  // Currency
  selectedCurrency: Currency;

  // Calculated prices
  subtotal: number;
  discountAmount: number;
  fees: number;
  total: number;

  // Available data
  availableTiers: TicketTier[];
  groupPricingRules: Map<string, GroupPricingRule[]>;

  // Actions
  selectTickets: (tierId: string, quantity: number, tier: TicketTier) => void;
  removeTicketSelection: (tierId: string) => void;
  clearAllSelections: () => void;

  setDiscountCode: (code: string | null) => void;
  setDiscountValidation: (validation: PricingState['discountValidation']) => void;

  setCurrency: (currency: Currency) => void;

  setAvailableTiers: (tiers: TicketTier[]) => void;
  setGroupPricingRules: (tierId: string, rules: GroupPricingRule[]) => void;

  calculatePrices: () => void;
  reset: () => void;
}

const initialState = {
  selectedTickets: new Map(),
  discountCode: null,
  discountValidation: null,
  selectedCurrency: 'USD' as Currency,
  subtotal: 0,
  discountAmount: 0,
  fees: 0,
  total: 0,
  availableTiers: [],
  groupPricingRules: new Map(),
};

export const usePricingStore = create<PricingState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      selectTickets: (tierId, quantity, tier) => {
        set((state) => {
          const newSelectedTickets = new Map(state.selectedTickets);

          if (quantity === 0) {
            newSelectedTickets.delete(tierId);
          } else {
            const subtotal = tier.price_cents * quantity;

            newSelectedTickets.set(tierId, {
              tierId,
              tierName: tier.name,
              quantity,
              pricePerTicket: tier.price_cents,
              subtotal,
            });
          }

          return { selectedTickets: newSelectedTickets };
        });

        // Recalculate prices after selection change
        get().calculatePrices();
      },

      removeTicketSelection: (tierId) => {
        set((state) => {
          const newSelectedTickets = new Map(state.selectedTickets);
          newSelectedTickets.delete(tierId);
          return { selectedTickets: newSelectedTickets };
        });

        get().calculatePrices();
      },

      clearAllSelections: () => {
        set({ selectedTickets: new Map() });
        get().calculatePrices();
      },

      setDiscountCode: (code) => {
        set({ discountCode: code, discountValidation: null });
      },

      setDiscountValidation: (validation) => {
        set({ discountValidation: validation });
        get().calculatePrices();
      },

      setCurrency: (currency) => {
        set({ selectedCurrency: currency });
        get().calculatePrices();
      },

      setAvailableTiers: (tiers) => {
        set({ availableTiers: tiers });
      },

      setGroupPricingRules: (tierId, rules) => {
        set((state) => {
          const newRules = new Map(state.groupPricingRules);
          newRules.set(tierId, rules);
          return { groupPricingRules: newRules };
        });
      },

      calculatePrices: () => {
        const state = get();

        // Calculate base subtotal
        let subtotal = 0;
        let maxGroupDiscount = 0;

        state.selectedTickets.forEach((selection) => {
          subtotal += selection.subtotal;

          // Check for group pricing discounts
          const rules = state.groupPricingRules.get(selection.tierId);
          if (rules && rules.length > 0) {
            // Find the best applicable discount for this tier
            const applicableRule = rules
              .filter((rule) => rule.min_quantity <= selection.quantity)
              .sort((a, b) => b.discount_percentage - a.discount_percentage)[0];

            if (applicableRule) {
              const tierDiscount =
                (selection.subtotal * applicableRule.discount_percentage) / 100;
              maxGroupDiscount += tierDiscount;
            }
          }
        });

        // Apply discount (code or group, whichever is better)
        let discountAmount = maxGroupDiscount;

        if (state.discountValidation?.isValid) {
          let codeDiscount = 0;

          if (state.discountValidation.type === 'percentage') {
            codeDiscount = (subtotal * (state.discountValidation.value || 0)) / 100;
          } else if (state.discountValidation.type === 'fixed') {
            codeDiscount = state.discountValidation.value || 0;
          }

          // Use the better discount
          if (codeDiscount > discountAmount) {
            discountAmount = codeDiscount;
          }
        }

        // Ensure discount doesn't exceed subtotal
        discountAmount = Math.min(discountAmount, subtotal);

        // Calculate fees (5.9% + 30 cents)
        const discountedAmount = subtotal - discountAmount;
        const fees = Math.round((discountedAmount * 59) / 1000 + 30);

        // Calculate total
        const total = discountedAmount + fees;

        set({
          subtotal,
          discountAmount,
          fees,
          total,
        });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'pricing-store',
    }
  )
);