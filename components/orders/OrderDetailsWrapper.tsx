"use client";

import { OrderDetails } from "./OrderDetails";
import { Database } from "@/lib/supabase/database.types";

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  order_number: string;
  event?: {
    id: string;
    title: string;
    start_at: string;
    community?: {
      name: string;
      slug: string;
    };
  };
  buyer?: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
  };
  tickets?: Array<{
    id: string;
    ticket_number: string;
    status: string;
    tier?: {
      name: string;
      price_cents: number;
    };
  }>;
  refunds?: Array<{
    id: string;
    amount_cents: number;
    reason: string;
    created_at: string;
    status: string;
  }>;
  modifications?: Array<{
    id: string;
    type: string;
    created_at: string;
    modified_by?: {
      name: string;
    };
  }>;
};

interface OrderDetailsWrapperProps {
  order: Order;
}

export function OrderDetailsWrapper({ order }: OrderDetailsWrapperProps) {
  console.log("[WRAPPER_DEBUG] OrderDetailsWrapper render:", {
    orderId: order.id,
    orderNumber: order.order_number
  });

  const handleRefund = async (orderId: string, amount: number, reason: string) => {
    console.log("[WRAPPER_DEBUG] Refund requested:", { orderId, amount, reason });
    // TODO: Implement refund logic via API call
  };

  const handleModify = async (orderId: string, modification: any) => {
    console.log("[WRAPPER_DEBUG] Modification requested:", { orderId, modification });
    // TODO: Implement modification logic via API call
  };

  const handleGenerateInvoice = async (orderId: string) => {
    console.log("[WRAPPER_DEBUG] Invoice generation requested:", { orderId });
    // TODO: Implement invoice generation via API call
  };

  const handleResendEmail = async (orderId: string) => {
    console.log("[WRAPPER_DEBUG] Email resend requested:", { orderId });
    // TODO: Implement email resend via API call
  };

  return (
    <OrderDetails
      order={order}
      onRefund={handleRefund}
      onModify={handleModify}
      onGenerateInvoice={handleGenerateInvoice}
      onResendEmail={handleResendEmail}
    />
  );
}