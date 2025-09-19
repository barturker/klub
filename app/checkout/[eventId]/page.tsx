"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StripeProvider } from "@/components/checkout/StripeProvider";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { usePaymentStore } from "@/hooks/usePaymentStore";
import { useCreatePaymentIntent, useConfirmPayment } from "@/hooks/usePaymentStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [isInitializing, setIsInitializing] = useState(true);
  const [eventData, setEventData] = useState<any>(null);
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  const {
    clientSecret,
    orderId,
    totalAmountCents,
    platformFeeCents,
    stripeFeeCents,
    totalFeeCents,
    setOrderDetails,
    setPaymentStatus,
  } = usePaymentStore();

  const createPaymentIntent = useCreatePaymentIntent();
  const confirmPayment = useConfirmPayment();

  useEffect(() => {
    // Fetch event and ticket tier data
    fetchEventData();
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      // This would normally fetch from your API
      // For now, we'll use placeholder data
      setEventData({
        id: eventId,
        name: "Sample Event",
        date: new Date().toISOString(),
        location: "Online",
      });

      setSelectedTier({
        id: "tier-1",
        name: "General Admission",
        price_cents: 2500,
        description: "Standard entry ticket",
      });

      setIsInitializing(false);
    } catch (error) {
      console.error("Error fetching event data:", error);
      setIsInitializing(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!eventData || !selectedTier) return;

    try {
      await createPaymentIntent.mutateAsync({
        eventId: eventData.id,
        ticketTierId: selectedTier.id,
        quantity,
        buyerEmail: "", // Would get from form
        buyerName: "", // Would get from form
      });
    } catch (error) {
      console.error("Error creating payment:", error);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!orderId) return;

    try {
      const result = await confirmPayment.mutateAsync({
        orderId,
        paymentIntentId,
      });

      if (result.success) {
        // Redirect to success page
        router.push(`/checkout/success?order_id=${orderId}`);
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
    }
  };

  const handlePaymentError = (error: string) => {
    setPaymentStatus("failed", error);
  };

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading checkout...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertTitle>Event Not Found</AlertTitle>
              <AlertDescription>
                The event you're trying to purchase tickets for could not be found.
              </AlertDescription>
            </Alert>
            <Link href="/events">
              <Button variant="outline" className="mt-4 w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Browse Events
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/events/${eventId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event
            </Button>
          </Link>
          <h1 className="mt-4 text-3xl font-bold">Complete Your Purchase</h1>
          <p className="mt-2 text-gray-600">
            You're purchasing tickets for {eventData.name}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content - Payment Form */}
          <div className="lg:col-span-2">
            {!clientSecret ? (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-4 text-lg font-semibold">Ticket Selection</h2>
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <h3 className="font-medium">{selectedTier.name}</h3>
                      <p className="text-sm text-gray-600">{selectedTier.description}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-lg font-semibold">
                          ${(selectedTier.price_cents / 100).toFixed(2)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            disabled={quantity <= 1}
                          >
                            -
                          </Button>
                          <span className="w-12 text-center">{quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuantity(Math.min(10, quantity + 1))}
                            disabled={quantity >= 10}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleCreatePayment}
                      disabled={createPaymentIntent.isPending}
                    >
                      {createPaymentIntent.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Continue to Payment"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <StripeProvider clientSecret={clientSecret}>
                    <CheckoutForm
                      orderId={orderId!}
                      amountCents={totalAmountCents}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  </StripeProvider>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1">
            {selectedTier && (
              <CheckoutSummary
                eventName={eventData.name}
                eventDate={eventData.date}
                eventLocation={eventData.location}
                ticketTierName={selectedTier.name}
                quantity={quantity}
                unitPriceCents={selectedTier.price_cents}
                subtotalCents={selectedTier.price_cents * quantity}
                platformFeeCents={platformFeeCents}
                stripeFeeCents={stripeFeeCents}
                totalFeeCents={totalFeeCents}
                totalAmountCents={
                  totalAmountCents || selectedTier.price_cents * quantity
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}