"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FixPendingOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    console.log("[FIX PAGE] Fetching pending orders...");
    setLoading(true);

    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in to access this page");
      router.push("/auth");
      return;
    }

    // Get pending orders
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        events:event_id (
          id,
          title,
          community_id
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[FIX PAGE] Error:", error);
      toast.error("Failed to fetch orders");
    } else {
      console.log("[FIX PAGE] Pending orders found:", data?.length || 0);
      setOrders(data || []);
    }

    setLoading(false);
  };

  const updateAllOrders = async () => {
    if (orders.length === 0) {
      toast.info("No pending orders to update");
      return;
    }

    const confirmed = window.confirm(
      `This will update ${orders.length} pending orders to PAID status and generate tickets. Continue?`
    );

    if (!confirmed) return;

    setUpdating(true);
    const supabase = createClient();
    let successCount = 0;
    let failCount = 0;

    for (const order of orders) {
      console.log(`[FIX PAGE] Updating order ${order.order_number}...`);

      // Update order to paid
      const { data: updatedOrder, error: updateError } = await supabase
        .from("orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: "card",
          metadata: {
            ...order.metadata,
            manually_fixed: true,
            fixed_at: new Date().toISOString(),
            fixed_reason: "bulk_fix_pending_orders"
          }
        })
        .eq("id", order.id)
        .select()
        .single();

      if (updateError) {
        console.error(`[FIX PAGE] Failed to update order ${order.order_number}:`, updateError);
        failCount++;
        continue;
      }

      // Generate ticket
      const ticketCode = `TKT${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`.toUpperCase();

      const { error: ticketError } = await supabase
        .from("tickets")
        .insert({
          order_id: order.id,
          event_id: order.event_id,
          user_id: order.buyer_id,
          ticket_number: ticketCode,
          status: "active",
          purchase_date: new Date().toISOString(),
          qr_code: ticketCode,
          metadata: {
            manually_created: true,
            created_from_fix: true
          }
        });

      if (ticketError) {
        console.error(`[FIX PAGE] Failed to create ticket for ${order.order_number}:`, ticketError);
      }

      successCount++;
    }

    setUpdating(false);

    if (successCount > 0) {
      toast.success(`Successfully updated ${successCount} orders to PAID`);
      // Refresh the list
      fetchPendingOrders();
    }

    if (failCount > 0) {
      toast.error(`Failed to update ${failCount} orders`);
    }
  };

  const updateSingleOrder = async (orderId: string) => {
    console.log(`[FIX PAGE] Updating single order ${orderId}...`);
    setUpdating(true);

    const supabase = createClient();
    const order = orders.find(o => o.id === orderId);

    if (!order) {
      toast.error("Order not found");
      setUpdating(false);
      return;
    }

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: "card",
        metadata: {
          ...order.metadata,
          manually_fixed: true,
          fixed_at: new Date().toISOString()
        }
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      console.error("[FIX PAGE] Update failed:", updateError);
      toast.error("Failed to update order");
      setUpdating(false);
      return;
    }

    // Generate ticket
    const ticketCode = `TKT${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`.toUpperCase();

    const { error: ticketError } = await supabase
      .from("tickets")
      .insert({
        order_id: orderId,
        event_id: order.event_id,
        user_id: order.buyer_id,
        ticket_number: ticketCode,
        status: "active",
        purchase_date: new Date().toISOString(),
        qr_code: ticketCode,
        metadata: {
          manually_created: true
        }
      });

    if (ticketError) {
      console.error("[FIX PAGE] Ticket creation failed:", ticketError);
      toast.warning("Order updated but ticket creation failed");
    } else {
      toast.success(`Order ${order.order_number} updated to PAID with ticket ${ticketCode}`);
    }

    setUpdating(false);
    fetchPendingOrders();
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Fix Pending Orders</CardTitle>
          <CardDescription>
            This page allows you to manually update pending orders to PAID status and generate tickets.
            This is a temporary fix while the webhook issue is being resolved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Webhook Status</span>
              </div>
              <p className="text-sm text-blue-800">
                Webhook is configured and running. New payments will automatically update.
                The orders below are from before the webhook was configured.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={fetchPendingOrders} disabled={loading || updating}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Refresh
              </Button>
              {orders.length > 0 && (
                <Button
                  onClick={updateAllOrders}
                  variant="default"
                  disabled={loading || updating}
                >
                  Update All to PAID ({orders.length} orders)
                </Button>
              )}
            </div>

            {/* Orders List */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">
                Pending Orders ({orders.length})
              </h3>

              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  <p className="mt-2">Loading pending orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 bg-green-50 rounded-lg">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="text-green-800 font-semibold">All orders are up to date!</p>
                  <p className="text-green-600 text-sm mt-1">
                    There are no pending orders that need to be fixed.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg divide-y">
                  {orders.map((order) => (
                    <div key={order.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{order.order_number}</span>
                            <Badge className="bg-yellow-100 text-yellow-800">
                              {order.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-0.5">
                            <p>Amount: ${(order.amount_cents / 100).toFixed(2)}</p>
                            <p>Email: {order.buyer_email || "N/A"}</p>
                            <p>Event: {order.events?.title || "N/A"}</p>
                            <p>Created: {new Date(order.created_at).toLocaleString()}</p>
                            {order.metadata?.stripe_session_id && (
                              <p className="text-xs">
                                Session: {order.metadata.stripe_session_id.substring(0, 20)}...
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => updateSingleOrder(order.id)}
                          disabled={updating}
                        >
                          Update to PAID
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Instructions:</h3>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Click "Update All to PAID" to fix all pending orders at once</li>
                <li>Or click individual "Update to PAID" buttons to fix specific orders</li>
                <li>This will mark orders as paid and generate tickets</li>
                <li>New orders will be handled automatically by the webhook</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}