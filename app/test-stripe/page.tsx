"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";

// Test card numbers for Stripe
const TEST_CARDS = [
  { number: "4242 4242 4242 4242", description: "Successful payment" },
  { number: "4000 0025 0000 3155", description: "Requires 3D Secure authentication" },
  { number: "4000 0000 0000 9995", description: "Payment declined" },
];

export default function TestStripePage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchEvents();
    fetchOrders();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchTiers(selectedEvent.id);
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events");
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        if (data.events && data.events.length > 0) {
          setSelectedEvent(data.events[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const fetchTiers = async (eventId: string) => {
    try {
      const response = await fetch(`/api/ticket-tiers?event_id=${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setTiers(data.tiers || []);
        if (data.tiers && data.tiers.length > 0) {
          setSelectedTier(data.tiers[0]);
        }
      } else {
        // Create a default tier if none exist
        createDefaultTier(eventId);
      }
    } catch (error) {
      console.error("Error fetching tiers:", error);
      createDefaultTier(eventId);
    }
  };

  const createDefaultTier = async (eventId: string) => {
    try {
      const response = await fetch("/api/ticket-tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          name: "General Admission",
          description: "Standard ticket for testing",
          price_cents: 2500, // $25
          max_quantity: 100,
          max_per_order: 10,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTiers([data]);
        setSelectedTier(data);
      }
    } catch (error) {
      console.error("Error creating tier:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders");
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const handleCheckoutSession = async () => {
    if (!selectedEvent || !selectedTier) {
      setError("Please select an event and ticket tier");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Sending to Stripe:", {
        eventId: selectedEvent.id,
        tierName: selectedTier.name,
        tierPrice: selectedTier.price_cents,
        priceInDollars: selectedTier.price_cents / 100,
      });

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          selectedTickets: [
            {
              tierId: selectedTier.id,
              quantity: 1,
            },
          ],
          currency: "USD",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentIntent = async () => {
    if (!selectedEvent || !selectedTier) {
      setError("Please select an event and ticket tier");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          tierId: selectedTier.id,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment intent");
      }

      // Navigate to custom checkout page
      router.push(`/checkout/${selectedEvent.id}?client_secret=${data.clientSecret}`);
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const testWebhook = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate a webhook event
      const response = await fetch("/api/stripe/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment_intent.succeeded",
          data: {
            object: {
              id: "pi_test_" + Date.now(),
              amount: 2500,
              currency: "usd",
              metadata: {
                event_id: selectedEvent?.id,
                user_id: "test_user",
              },
            },
          },
        }),
      });

      if (response.ok) {
        setSuccess(true);
        fetchOrders();
        setTimeout(() => setSuccess(false), 5000);
      } else {
        throw new Error("Webhook test failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Webhook test failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            <CardTitle>Stripe Integration Test Dashboard</CardTitle>
          </div>
          <CardDescription>
            Test all Stripe payment features in your application
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Event Selection */}
        <Card>
          <CardHeader>
            <CardTitle>1. Select Event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {events.length > 0 ? (
              <select
                className="w-full p-2 border rounded"
                value={selectedEvent?.id || ""}
                onChange={(e) => {
                  const event = events.find((ev) => ev.id === e.target.value);
                  setSelectedEvent(event);
                }}
              >
                <option value="">Select an event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} - {event.start_at ? new Date(event.start_at).toLocaleDateString() : "No date"}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-muted-foreground">No events found</p>
            )}

            {selectedEvent && (
              <div className="p-3 bg-muted rounded">
                <p className="font-medium">{selectedEvent.title}</p>
                <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ticket Tier Selection */}
        <Card>
          <CardHeader>
            <CardTitle>2. Select Ticket Tier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedEvent && tiers.length > 0 ? (
              <select
                className="w-full p-2 border rounded"
                value={selectedTier?.id || ""}
                onChange={(e) => {
                  const tier = tiers.find((t) => t.id === e.target.value);
                  setSelectedTier(tier);
                }}
              >
                <option value="">Select a tier</option>
                {tiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name} - ${(tier.price_cents / 100).toFixed(2)}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-muted-foreground">
                {selectedEvent ? "No ticket tiers found" : "Select an event first"}
              </p>
            )}

            {selectedTier && (
              <div className="p-3 bg-muted rounded">
                <p className="font-medium">{selectedTier.name}</p>
                <p className="text-sm text-muted-foreground">{selectedTier.description}</p>
                <p className="text-lg font-bold mt-2">${(selectedTier.price_cents / 100).toFixed(2)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Actions */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>3. Test Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Success!</AlertTitle>
                <AlertDescription className="text-green-700">
                  Operation completed successfully
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <Button
                onClick={handleCheckoutSession}
                disabled={isLoading || !selectedEvent || !selectedTier}
                size="lg"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Test Checkout Session
                  </>
                )}
              </Button>

              <Button
                onClick={handlePaymentIntent}
                disabled={isLoading || !selectedEvent || !selectedTier}
                variant="secondary"
                size="lg"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Test Payment Intent
                  </>
                )}
              </Button>

              <Button
                onClick={testWebhook}
                disabled={isLoading || !selectedEvent}
                variant="outline"
                size="lg"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Test Webhook"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Cards Reference */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Test Card Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {TEST_CARDS.map((card) => (
                <div key={card.number} className="flex justify-between p-2 bg-muted rounded">
                  <code className="font-mono">{card.number}</code>
                  <span className="text-sm text-muted-foreground">{card.description}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Use any future date for expiry, any 3-digit CVC, and any 5-digit ZIP code
            </p>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length > 0 ? (
              <div className="space-y-2">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        Status: <span className="font-medium">{order.status}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${(order.amount_cents / 100).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No orders yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Environment Status */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Environment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span>Stripe Public Key:</span>
              <code className="text-xs">
                {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 20)}...
              </code>
            </div>
            <div className="flex justify-between">
              <span>App URL:</span>
              <code className="text-xs">{process.env.NEXT_PUBLIC_APP_URL}</code>
            </div>
            <div className="flex justify-between">
              <span>Mode:</span>
              <span className="font-medium text-yellow-600">Test Mode</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}