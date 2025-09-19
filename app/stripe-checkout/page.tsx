"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, CheckCircle, AlertCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

// Load Stripe with your test publishable key
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

function CheckoutForm({ amount }: { amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Return URL for redirect-based payment methods
        return_url: `${window.location.origin}/stripe-checkout/success`,
      },
      redirect: "if_required", // Only redirect if necessary (3D Secure, etc.)
    });

    if (error) {
      // Payment failed
      setPaymentStatus("error");
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message || "Payment failed");
      } else {
        setMessage("An unexpected error occurred.");
      }
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Payment succeeded
      setPaymentStatus("success");
      setMessage(`Payment successful! Payment ID: ${paymentIntent.id}`);

      // Redirect to success page after 2 seconds
      setTimeout(() => {
        router.push(`/stripe-checkout/success?payment_intent=${paymentIntent.id}`);
      }, 2000);
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      <Button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay ${(amount / 100).toFixed(2)}
          </>
        )}
      </Button>

      {message && (
        <Alert variant={paymentStatus === "error" ? "destructive" : "default"}>
          {paymentStatus === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}

export default function StripeCheckoutPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState(5000); // $50.00 in cents
  const [fees, setFees] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentIntent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get event ID from URL params (will be passed when navigating to checkout)
      const urlParams = new URLSearchParams(window.location.search);
      const eventId = urlParams.get("eventId") || "97415404-7c76-4134-89bc-f99c88b7af1c"; // Fallback test event ID

      const response = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency: "usd",
          eventId, // Include event ID
          description: "Test Event Ticket",
          metadata: {
            event_name: "Next.js Workshop",
            ticket_type: "General Admission",
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment intent");
      }

      setClientSecret(data.clientSecret);
      setFees({
        platformFee: data.platformFee,
        stripeFee: data.stripeFee,
        totalFee: data.totalFee,
        netAmount: data.netAmount,
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    createPaymentIntent();
  }, []);

  const options = {
    clientSecret,
    appearance: {
      theme: "stripe" as const,
      variables: {
        colorPrimary: "#0070f3",
      },
    },
  };

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Stripe Checkout (Real Test Mode)</h1>
        <p className="text-muted-foreground">
          This uses real Stripe API in test mode - no actual charges!
        </p>
      </div>

      <div className="grid gap-8">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
            <CardDescription>Next.js & Stripe Workshop</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Event Ticket</span>
                <span className="font-semibold">${(amount / 100).toFixed(2)}</span>
              </div>
              {fees && (
                <>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Platform Fee (3%)</span>
                    <span>${(fees.platformFee / 100).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-lg">
                      ${((amount + fees.platformFee) / 100).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>Enter your payment information below</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}

            {clientSecret && (
              <Elements stripe={stripePromise} options={options}>
                <CheckoutForm amount={amount + (fees?.platformFee || 0)} />
              </Elements>
            )}
          </CardContent>
        </Card>

        {/* Test Cards Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Test Mode Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Test Cards to Try:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>✅ Success: 4242 4242 4242 4242</li>
                  <li>🔐 3D Secure: 4000 0027 6000 3184</li>
                  <li>❌ Decline: 4000 0000 0000 9995</li>
                  <li>Use any CVV (123) and future date (12/34)</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="mt-4 text-sm text-muted-foreground">
              <p>This integration uses:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Real Stripe API in test mode</li>
                <li>Payment Element (supports cards, wallets, etc.)</li>
                <li>Server-side payment intent creation</li>
                <li>3D Secure authentication when required</li>
                <li>Database order tracking</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}