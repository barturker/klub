"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, Play, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function OrderTestPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);

  // Fetch orders
  const fetchOrders = async () => {
    console.log("[TEST PAGE] Fetching orders...");
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        events:event_id (
          title,
          start_at
        ),
        tickets (
          id,
          ticket_number,
          status
        )
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("[TEST PAGE] Error fetching orders:", error);
      toast.error("Failed to fetch orders");
    } else {
      console.log("[TEST PAGE] Orders fetched:", data);
      setOrders(data || []);
    }
    setLoading(false);
  };

  // Check webhook configuration
  const checkWebhookConfig = async () => {
    console.log("[TEST PAGE] Checking webhook configuration...");
    const response = await fetch("/api/test/check-webhook-config");
    const result = await response.json();
    console.log("[TEST PAGE] Webhook config:", result);
    setWebhookSecret(result.hasWebhookSecret ? "Configured" : "Missing");

    if (!result.hasWebhookSecret) {
      toast.error("STRIPE_WEBHOOK_SECRET is not configured!");
    } else {
      toast.success("Webhook secret is configured");
    }
  };

  // Simulate webhook for an order
  const simulateWebhook = async (orderId: string) => {
    console.log("[TEST PAGE] Simulating webhook for order:", orderId);
    setLoading(true);

    try {
      const response = await fetch("/api/test/simulate-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();
      console.log("[TEST PAGE] Simulation result:", result);

      if (response.ok) {
        toast.success(`Order ${result.order?.order_number} updated to PAID!`);
        if (result.ticket) {
          toast.success(`Ticket generated: ${result.ticket.ticket_number}`);
        }
        await fetchOrders(); // Refresh orders
      } else {
        toast.error(result.error || "Simulation failed");
      }
    } catch (error) {
      console.error("[TEST PAGE] Simulation error:", error);
      toast.error("Failed to simulate webhook");
    }

    setLoading(false);
  };

  // Test real webhook endpoint
  const testRealWebhook = async (orderId: string) => {
    console.log("[TEST PAGE] Testing real webhook endpoint for order:", orderId);
    setLoading(true);

    try {
      const response = await fetch("/api/test/trigger-real-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();
      console.log("[TEST PAGE] Real webhook test result:", result);

      if (response.ok) {
        toast.success("Real webhook test completed");
        await fetchOrders();
      } else {
        toast.error(result.error || "Real webhook test failed");
      }
    } catch (error) {
      console.error("[TEST PAGE] Real webhook test error:", error);
      toast.error("Failed to test real webhook");
    }

    setLoading(false);
  };

  // Create test order
  const createTestOrder = async () => {
    console.log("[TEST PAGE] Creating test order...");
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in to create test orders");
      setLoading(false);
      return;
    }

    // Get first event
    const { data: events } = await supabase
      .from("events")
      .select("id, title")
      .limit(1);

    if (!events || events.length === 0) {
      toast.error("No events found");
      setLoading(false);
      return;
    }

    const testOrderData = {
      event_id: events[0].id,
      buyer_id: user.id,
      buyer_email: user.email,
      buyer_name: user.user_metadata?.name || "Test User",
      status: "pending",
      amount_cents: 2500, // $25.00
      fee_cents: 250, // $2.50
      platform_fee_cents: 125, // $1.25
      organizer_fee_cents: 125, // $1.25
      metadata: {
        stripe_session_id: `test_session_${Date.now()}`,
        created_from_test: true,
      },
    };

    const { data: order, error } = await supabase
      .from("orders")
      .insert(testOrderData)
      .select()
      .single();

    if (error) {
      console.error("[TEST PAGE] Error creating order:", error);
      toast.error("Failed to create test order");
    } else {
      console.log("[TEST PAGE] Test order created:", order);
      toast.success(`Test order ${order.order_number} created`);
      await fetchOrders();
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    checkWebhookConfig();
  }, []);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  const statusIcons: Record<string, any> = {
    pending: AlertCircle,
    paid: CheckCircle,
    failed: XCircle,
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Order System Test Page</h1>
          <Button onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Configuration Status */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">STRIPE_WEBHOOK_SECRET:</span>
                <Badge className={webhookSecret === "Configured" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {webhookSecret || "Checking..."}
                </Badge>
              </div>
              {webhookSecret === "Missing" && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mt-4">
                  <p className="text-sm text-yellow-800">
                    <strong>To configure webhook secret:</strong>
                  </p>
                  <ol className="text-sm text-yellow-700 mt-2 space-y-1 list-decimal list-inside">
                    <li>Install Stripe CLI: <code className="bg-yellow-100 px-1">winget install Stripe.Stripe</code></li>
                    <li>Login to Stripe: <code className="bg-yellow-100 px-1">stripe login</code></li>
                    <li>Listen to webhooks: <code className="bg-yellow-100 px-1">stripe listen --forward-to localhost:3000/api/stripe/webhook</code></li>
                    <li>Copy the webhook signing secret and add to .env.local as STRIPE_WEBHOOK_SECRET</li>
                    <li>Restart the dev server</li>
                  </ol>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={createTestOrder} disabled={loading}>
              Create Test Order (Pending)
            </Button>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders ({orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No orders found</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const StatusIcon = statusIcons[order.status] || AlertCircle;
                  return (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <StatusIcon className="h-5 w-5" />
                            <span className="font-medium">{order.order_number}</span>
                            <Badge className={statusColors[order.status]}>
                              {order.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>Email: {order.buyer_email}</p>
                            <p>Amount: ${(order.amount_cents / 100).toFixed(2)}</p>
                            <p>Event: {order.events?.title || "N/A"}</p>
                            <p>Created: {new Date(order.created_at).toLocaleString()}</p>
                            {order.paid_at && (
                              <p className="text-green-600">Paid: {new Date(order.paid_at).toLocaleString()}</p>
                            )}
                            {order.tickets && order.tickets.length > 0 && (
                              <p className="text-blue-600">
                                Tickets: {order.tickets.map((t: any) => t.ticket_number).join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          {order.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => simulateWebhook(order.id)}
                                disabled={loading}
                              >
                                <Play className="mr-1 h-3 w-3" />
                                Simulate Webhook
                              </Button>
                              {webhookSecret === "Configured" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => testRealWebhook(order.id)}
                                  disabled={loading}
                                >
                                  Test Real Webhook
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {order.metadata && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-500 cursor-pointer">Metadata</summary>
                          <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(order.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold mb-1">1. Test with Simulated Webhook (Always Works)</h3>
                <p className="text-gray-600">Click "Simulate Webhook" on any pending order to simulate what the Stripe webhook would do. This updates the order to paid and generates tickets.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">2. Test with Real Webhook (Requires Configuration)</h3>
                <p className="text-gray-600">Configure STRIPE_WEBHOOK_SECRET first, then use "Test Real Webhook" to send a real webhook event through the actual endpoint.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">3. Test with Actual Stripe Payment</h3>
                <p className="text-gray-600">Go to an event page, click "Get Tickets", complete the Stripe checkout, and the webhook should automatically update the order.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}