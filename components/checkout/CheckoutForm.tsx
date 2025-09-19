"use client";

import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
  AddressElement,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { formatAmountForDisplay } from "@/lib/stripe/client";

interface CheckoutFormProps {
  orderId: string;
  amountCents: number;
  onSuccess: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
  showBillingAddress?: boolean;
}

export function CheckoutForm({
  orderId,
  amountCents,
  onSuccess,
  onError,
  showBillingAddress = true,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "succeeded" | "failed"
  >("idle");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setErrorMessage("Stripe has not loaded yet. Please try again.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setPaymentStatus("processing");

    try {
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success?order_id=${orderId}`,
        },
        redirect: "if_required",
      });

      if (error) {
        // Handle errors
        if (error.type === "card_error" || error.type === "validation_error") {
          setErrorMessage(error.message || "Payment failed");
        } else {
          setErrorMessage("An unexpected error occurred. Please try again.");
        }
        setPaymentStatus("failed");
        onError?.(error.message || "Payment failed");
      } else if (paymentIntent) {
        // Payment succeeded
        if (paymentIntent.status === "succeeded") {
          setPaymentStatus("succeeded");
          onSuccess(paymentIntent.id);
        } else if (paymentIntent.status === "requires_action") {
          // 3D Secure or additional authentication required
          // Stripe will handle this automatically
          setErrorMessage("Additional authentication required. Please complete the verification.");
        } else {
          setErrorMessage(`Payment status: ${paymentIntent.status}`);
          setPaymentStatus("failed");
        }
      }
    } catch (err) {
      console.error("Payment error:", err);
      setErrorMessage("An unexpected error occurred. Please try again.");
      setPaymentStatus("failed");
      onError?.("Payment processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const paymentElementOptions = {
    layout: "tabs" as const,
    paymentMethodOrder: ["card", "apple_pay", "google_pay"],
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-4 text-sm font-medium">Payment Details</h3>
        <PaymentElement options={paymentElementOptions} />
      </div>

      {/* Billing Address */}
      {showBillingAddress && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-4 text-sm font-medium">Billing Address</h3>
          <AddressElement options={{ mode: "billing" }} />
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {paymentStatus === "succeeded" && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Payment successful! Redirecting...
          </AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || isProcessing || paymentStatus === "succeeded"}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : paymentStatus === "succeeded" ? (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Payment Complete
          </>
        ) : (
          `Pay ${formatAmountForDisplay(amountCents)}`
        )}
      </Button>

      {/* Test Mode Notice */}
      {process.env.NODE_ENV === "development" && (
        <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
          <strong>Test Mode:</strong> Use card number 4242 4242 4242 4242 with any future date and CVC.
        </div>
      )}
    </form>
  );
}