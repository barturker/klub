import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/database.types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Refund = Database["public"]["Tables"]["refunds"]["Insert"];

interface OrdersFilter {
  event_id?: string;
  community_id?: string;
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

interface RefundRequest {
  order_id: string;
  amount_cents: number;
  reason: string;
  reason_details?: string;
  notify_customer?: boolean;
}

interface OrderModification {
  order_id: string;
  type: "upgrade" | "downgrade" | "transfer";
  new_ticket_tier_id?: string;
  new_quantity?: number;
  transfer_to_email?: string;
  reason: string;
}

// Fetch orders with filters
export function useOrders(filters: OrdersFilter) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["orders", filters],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select(
          `
          *,
          event:events (
            id,
            title,
            start_at,
            community:communities (
              name
            )
          ),
          buyer:profiles!orders_user_id_fkey (
            id,
            email,
            name,
            avatar_url
          ),
          tickets (
            id,
            ticket_number,
            status,
            tier:ticket_tiers (
              name,
              price_cents
            )
          ),
          refunds (
            id,
            amount_cents,
            reason,
            status,
            created_at
          ),
          order_modifications (
            id,
            type,
            created_at,
            modified_by:profiles!order_modifications_modified_by_fkey (
              name
            )
          )
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.event_id) {
        query = query.eq("event_id", filters.event_id);
      }
      if (filters.community_id) {
        query = query.eq("event.community_id", filters.community_id);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.search) {
        query = query.or(
          `order_number.ilike.%${filters.search}%,buyer.email.ilike.%${filters.search}%`
        );
      }
      if (filters.date_from) {
        query = query.gte("created_at", filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte("created_at", filters.date_to);
      }

      // Pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        orders: data || [],
        totalCount: count || 0,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// Fetch single order details
export function useOrder(orderId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          event:events (
            id,
            title,
            start_at,
            community:communities (
              name
            )
          ),
          buyer:profiles!orders_user_id_fkey (
            id,
            email,
            name,
            avatar_url
          ),
          tickets (
            id,
            ticket_number,
            status,
            tier:ticket_tiers (
              name,
              price_cents
            )
          ),
          refunds (
            id,
            amount_cents,
            reason,
            reason_details,
            status,
            created_at,
            processed_at
          ),
          order_modifications (
            id,
            type,
            old_values,
            new_values,
            price_difference_cents,
            reason,
            created_at,
            modified_by:profiles!order_modifications_modified_by_fkey (
              name
            )
          )
        `
        )
        .eq("id", orderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
}

// Process refund
export function useProcessRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (refund: RefundRequest) => {
      const response = await fetch(`/api/orders/${refund.order_id}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount_cents: refund.amount_cents,
          reason: refund.reason,
          reason_details: refund.reason_details,
          notify_customer: refund.notify_customer,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to process refund");
      }

      return response.json();
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["order", variables.order_id] });
      await queryClient.cancelQueries({ queryKey: ["orders"] });

      // Snapshot the previous value
      const previousOrder = queryClient.getQueryData(["order", variables.order_id]);

      // Optimistically update the order
      queryClient.setQueryData(["order", variables.order_id], (old: any) => {
        if (!old) return old;

        // Determine if this is a full refund
        const isFullRefund = variables.amount_cents >= old.amount_cents;

        // Update order status
        const newStatus = isFullRefund ? "refunded" : "partially_refunded";

        // Update tickets to refunded status if full refund
        const updatedTickets = old.tickets?.map((ticket: any) => ({
          ...ticket,
          status: isFullRefund ? "refunded" : ticket.status,
        })) || [];

        // Add optimistic refund record
        const optimisticRefund = {
          id: `temp-${Date.now()}`, // Temporary ID
          amount_cents: variables.amount_cents,
          reason: variables.reason,
          reason_details: variables.reason_details,
          status: "processing",
          created_at: new Date().toISOString(),
          processed_at: null,
        };

        return {
          ...old,
          status: newStatus,
          refunded_at: isFullRefund ? new Date().toISOString() : old.refunded_at,
          tickets: updatedTickets,
          refunds: [...(old.refunds || []), optimisticRefund],
        };
      });

      // Also update the orders list if it's cached
      queryClient.setQueriesData({ queryKey: ["orders"] }, (old: any) => {
        if (!old?.orders) return old;

        const updatedOrders = old.orders.map((order: any) => {
          if (order.id === variables.order_id) {
            const isFullRefund = variables.amount_cents >= order.amount_cents;
            const newStatus = isFullRefund ? "refunded" : "partially_refunded";

            return {
              ...order,
              status: newStatus,
              refunded_at: isFullRefund ? new Date().toISOString() : order.refunded_at,
              tickets: order.tickets?.map((ticket: any) => ({
                ...ticket,
                status: isFullRefund ? "refunded" : ticket.status,
              })) || [],
            };
          }
          return order;
        });

        return {
          ...old,
          orders: updatedOrders,
        };
      });

      // Return a context object with the snapshotted value
      return { previousOrder };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousOrder) {
        queryClient.setQueryData(["order", variables.order_id], context.previousOrder);
      }
    },
    onSettled: (_, __, variables) => {
      // Always refetch after error or success to ensure we have the correct data
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", variables.order_id] });
    },
  });
}

// Modify order
export function useModifyOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (modification: OrderModification) => {
      const response = await fetch(`/api/orders/${modification.order_id}/modify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: modification.type,
          new_ticket_tier_id: modification.new_ticket_tier_id,
          new_quantity: modification.new_quantity,
          transfer_to_email: modification.transfer_to_email,
          reason: modification.reason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to modify order");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", variables.order_id] });
    },
  });
}

// Export orders
export function useExportOrders() {
  return useMutation({
    mutationFn: async (params: {
      event_id?: string;
      community_id?: string;
      date_from?: string;
      date_to?: string;
      format: "csv" | "excel" | "pdf";
      columns?: string[];
    }) => {
      console.log("[CLIENT_EXPORT_DEBUG] ========== Starting export request ==========");
      console.log("[CLIENT_EXPORT_DEBUG] Export parameters:", params);
      console.log("[CLIENT_EXPORT_DEBUG] Timestamp:", new Date().toISOString());

      console.log("[CLIENT_EXPORT_DEBUG] Making POST request to /api/orders/export...");

      const response = await fetch("/api/orders/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      console.log("[CLIENT_EXPORT_DEBUG] Response received:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        console.log("[CLIENT_EXPORT_DEBUG] Response not OK, parsing error...");
        let errorData;
        try {
          errorData = await response.json();
          console.log("[CLIENT_EXPORT_DEBUG] Error response data:", errorData);
        } catch (jsonError) {
          console.error("[CLIENT_EXPORT_DEBUG] Failed to parse error response as JSON:", jsonError);
          console.log("[CLIENT_EXPORT_DEBUG] Raw error response:", await response.text());
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const errorMessage = errorData.message || errorData.error || "Failed to export orders";
        console.error("[CLIENT_EXPORT_DEBUG] Throwing error:", errorMessage);
        throw new Error(errorMessage);
      }

      console.log("[CLIENT_EXPORT_DEBUG] Parsing successful response...");
      const result = await response.json();
      console.log("[CLIENT_EXPORT_DEBUG] Success response data:", result);
      console.log("[CLIENT_EXPORT_DEBUG] ========== Export request completed ==========");

      return result;
    },
  });
}

// Cancel event and refund all orders
export function useCancelEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      event_id: string;
      reason: string;
      notify_attendees: boolean;
    }) => {
      const response = await fetch(`/api/events/${params.event_id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: params.reason,
          notify_attendees: params.notify_attendees,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to cancel event");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

// Generate invoice
export function useGenerateInvoice() {
  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}/invoice`, {
        method: "GET",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate invoice");
      }

      return response.json();
    },
  });
}

// Order statistics
export function useOrderStats(filters: {
  event_id?: string;
  community_id?: string;
  date_from?: string;
  date_to?: string;
}) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["order-stats", filters],
    queryFn: async () => {
      // Get order summary statistics
      const { data: orders, error } = await supabase
        .from("orders")
        .select("status, amount_cents, fee_cents, created_at")
        .match(filters);

      if (error) throw error;

      // Calculate statistics
      const stats = {
        total_orders: orders?.length || 0,
        total_revenue: 0,
        total_fees: 0,
        total_refunded: 0,
        by_status: {} as Record<string, number>,
        daily_orders: {} as Record<string, number>,
      };

      orders?.forEach((order) => {
        // Revenue
        if (order.status === "paid" || order.status === "partially_refunded") {
          stats.total_revenue += order.amount_cents;
          stats.total_fees += order.fee_cents || 0;
        }

        // Status counts
        stats.by_status[order.status] = (stats.by_status[order.status] || 0) + 1;

        // Daily counts
        const date = new Date(order.created_at).toISOString().split("T")[0];
        stats.daily_orders[date] = (stats.daily_orders[date] || 0) + 1;
      });

      // Get refund totals
      const { data: refunds } = await supabase
        .from("refunds")
        .select("amount_cents")
        .eq("status", "succeeded");

      stats.total_refunded =
        refunds?.reduce((sum, r) => sum + r.amount_cents, 0) || 0;

      return stats;
    },
  });
}