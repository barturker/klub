"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePaymentStore } from "./usePaymentStore";

interface PaymentStatusResponse {
  status: "pending" | "processing" | "succeeded" | "failed" | "cancelled";
  order?: any;
  tickets?: any[];
  error?: string;
}

interface CreatePaymentIntentRequest {
  eventId: string;
  ticketTierId: string;
  quantity: number;
  discountCode?: string;
  buyerEmail: string;
  buyerName: string;
}

interface CreatePaymentIntentResponse {
  orderId: string;
  clientSecret: string;
  amountCents: number;
  feeCents: number;
  platformFee: number;
  stripeFee: number;
  netAmount: number;
  currency: string;
}

interface ConfirmPaymentRequest {
  orderId: string;
  paymentIntentId: string;
}

interface ConfirmPaymentResponse {
  success: boolean;
  order: any;
  tickets: any[];
  receiptUrl?: string;
  event?: any;
  ticketTier?: any;
  error?: string;
}

// Create payment intent
export function useCreatePaymentIntent() {
  const setOrderDetails = usePaymentStore((state) => state.setOrderDetails);
  const setPaymentIntent = usePaymentStore((state) => state.setPaymentIntent);

  return useMutation<CreatePaymentIntentResponse, Error, CreatePaymentIntentRequest>({
    mutationFn: async (data) => {
      const response = await fetch("/api/checkout/create-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: data.eventId,
          ticket_tier_id: data.ticketTierId,
          quantity: data.quantity,
          discount_code: data.discountCode,
          buyer_email: data.buyerEmail,
          buyer_name: data.buyerName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create payment intent");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setOrderDetails({
        orderId: data.orderId,
        totalAmountCents: data.amountCents,
        totalFeeCents: data.feeCents,
        platformFeeCents: data.platformFee,
        stripeFeeCents: data.stripeFee,
        currency: data.currency,
      });
      setPaymentIntent(data.orderId, data.clientSecret);
    },
  });
}

// Confirm payment
export function useConfirmPayment() {
  const queryClient = useQueryClient();
  const setPaymentStatus = usePaymentStore((state) => state.setPaymentStatus);

  return useMutation<ConfirmPaymentResponse, Error, ConfirmPaymentRequest>({
    mutationFn: async (data) => {
      const response = await fetch("/api/checkout/confirm-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: data.orderId,
          payment_intent_id: data.paymentIntentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to confirm payment");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setPaymentStatus("succeeded");
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      } else {
        setPaymentStatus("failed", data.error);
      }
    },
    onError: (error) => {
      setPaymentStatus("failed", error.message);
    },
  });
}

// Poll payment status
export function usePaymentStatus(orderId: string | null, enabled = false) {
  return useQuery<PaymentStatusResponse>({
    queryKey: ["payment-status", orderId],
    queryFn: async () => {
      if (!orderId) throw new Error("No order ID");

      const response = await fetch(`/api/checkout/status?order_id=${orderId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch payment status");
      }

      return response.json();
    },
    enabled: enabled && !!orderId,
    refetchInterval: (data) => {
      // Poll every 2 seconds while processing
      if (data?.status === "processing" || data?.status === "pending") {
        return 2000;
      }
      // Stop polling once succeeded or failed
      return false;
    },
    staleTime: 1000,
  });
}

// Retry failed payment
export function useRetryPayment() {
  const queryClient = useQueryClient();
  const setPaymentStatus = usePaymentStore((state) => state.setPaymentStatus);

  return useMutation<
    { clientSecret: string; status: string },
    Error,
    { orderId: string; paymentMethodId: string }
  >({
    mutationFn: async (data) => {
      const response = await fetch("/api/checkout/retry-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: data.orderId,
          payment_method_id: data.paymentMethodId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to retry payment");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setPaymentStatus("pending");
      // Invalidate payment status query to trigger re-polling
      queryClient.invalidateQueries({ queryKey: ["payment-status"] });
    },
    onError: (error) => {
      setPaymentStatus("failed", error.message);
    },
  });
}

// Get order details
export function useOrderDetails(orderId: string | null) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      if (!orderId) throw new Error("No order ID");

      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch order");
      }

      return response.json();
    },
    enabled: !!orderId,
    staleTime: 60000, // Consider data fresh for 1 minute
  });
}

// Get user's tickets
export function useUserTickets() {
  return useQuery({
    queryKey: ["user-tickets"],
    queryFn: async () => {
      const response = await fetch("/api/tickets/my-tickets");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch tickets");
      }

      return response.json();
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}