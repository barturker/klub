import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PaymentState {
  // Order details
  orderId: string | null;
  eventId: string | null;
  ticketTierId: string | null;
  quantity: number;

  // Pricing
  unitPriceCents: number;
  subtotalCents: number;
  platformFeeCents: number;
  stripeFeeCents: number;
  totalFeeCents: number;
  totalAmountCents: number;
  discountCents: number;
  currency: string;

  // Buyer info
  buyerEmail: string;
  buyerName: string;

  // Payment status
  paymentIntentId: string | null;
  clientSecret: string | null;
  paymentStatus: "idle" | "pending" | "processing" | "succeeded" | "failed" | "cancelled";
  errorMessage: string | null;

  // Event & tier details (for display)
  eventName: string;
  eventDate: string | null;
  eventLocation: string | null;
  ticketTierName: string;
  ticketTierDescription: string | null;

  // Actions
  setOrderDetails: (details: Partial<PaymentState>) => void;
  setPaymentIntent: (intentId: string, clientSecret: string) => void;
  setPaymentStatus: (status: PaymentState["paymentStatus"], error?: string) => void;
  setBuyerInfo: (email: string, name: string) => void;
  clearPayment: () => void;
  reset: () => void;
}

const initialState = {
  orderId: null,
  eventId: null,
  ticketTierId: null,
  quantity: 1,
  unitPriceCents: 0,
  subtotalCents: 0,
  platformFeeCents: 0,
  stripeFeeCents: 0,
  totalFeeCents: 0,
  totalAmountCents: 0,
  discountCents: 0,
  currency: "USD",
  buyerEmail: "",
  buyerName: "",
  paymentIntentId: null,
  clientSecret: null,
  paymentStatus: "idle" as const,
  errorMessage: null,
  eventName: "",
  eventDate: null,
  eventLocation: null,
  ticketTierName: "",
  ticketTierDescription: null,
};

export const usePaymentStore = create<PaymentState>()(
  persist(
    (set) => ({
      ...initialState,

      setOrderDetails: (details) =>
        set((state) => ({
          ...state,
          ...details,
        })),

      setPaymentIntent: (intentId, clientSecret) =>
        set({
          paymentIntentId: intentId,
          clientSecret,
          paymentStatus: "pending",
        }),

      setPaymentStatus: (status, error) =>
        set({
          paymentStatus: status,
          errorMessage: error || null,
        }),

      setBuyerInfo: (email, name) =>
        set({
          buyerEmail: email,
          buyerName: name,
        }),

      clearPayment: () =>
        set({
          paymentIntentId: null,
          clientSecret: null,
          paymentStatus: "idle",
          errorMessage: null,
        }),

      reset: () => set(initialState),
    }),
    {
      name: "payment-storage",
      partialize: (state) => ({
        // Only persist essential data
        orderId: state.orderId,
        eventId: state.eventId,
        ticketTierId: state.ticketTierId,
        quantity: state.quantity,
        buyerEmail: state.buyerEmail,
        buyerName: state.buyerName,
      }),
    }
  )
);