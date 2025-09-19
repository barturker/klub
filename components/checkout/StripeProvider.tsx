"use client";

import { Elements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe/client";
import { ReactNode } from "react";

interface StripeProviderProps {
  children: ReactNode;
  clientSecret?: string;
  appearance?: {
    theme?: "stripe" | "night" | "flat";
    variables?: Record<string, string>;
  };
}

export function StripeProvider({
  children,
  clientSecret,
  appearance = {
    theme: "stripe",
    variables: {
      colorPrimary: "#0070f3",
      colorBackground: "#ffffff",
      colorText: "#30313d",
      colorDanger: "#df1b41",
      fontFamily: "system-ui, sans-serif",
      spacingUnit: "4px",
      borderRadius: "8px",
    },
  },
}: StripeProviderProps) {
  const stripePromise = getStripe();

  if (!stripePromise) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">
          Stripe is not configured. Please add your Stripe publishable key to the environment variables.
        </p>
      </div>
    );
  }

  const options = clientSecret
    ? {
        clientSecret,
        appearance,
        loader: "auto" as const,
      }
    : undefined;

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}