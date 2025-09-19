import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null>;

export function getStripe() {
  if (!stripePromise) {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      console.error("Stripe publishable key is not configured");
      return null;
    }

    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }

  return stripePromise;
}

export const STRIPE_TEST_MODE = !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_live");

export const TEST_CARDS = {
  success: "4242424242424242",
  decline: "4000000000009995",
  authentication: "4000002760003184",
  networkError: "4000000000009987",
  insufficientFunds: "4000000000009995",
  expiredCard: "4000000000000069",
  processingError: "4000000000000119",
  incorrectCvc: "4000000000000127",
} as const;

export const formatAmountForDisplay = (
  amount: number,
  currency: string = "USD"
): string => {
  const numberFormat = new Intl.NumberFormat(["en-US"], {
    style: "currency",
    currency: currency,
    currencyDisplay: "symbol",
  });

  const amountInDollars = amount / 100;
  return numberFormat.format(amountInDollars);
};

export const formatAmountForStripe = (
  amount: number,
  currency: string = "USD"
): number => {
  const currenciesWithNoDecimals = ["JPY", "KRW"];

  if (currenciesWithNoDecimals.includes(currency.toUpperCase())) {
    return Math.round(amount);
  }

  return Math.round(amount * 100);
};

export interface StripeError {
  type: string;
  code?: string;
  message: string;
  param?: string;
}

export function isStripeError(error: any): error is StripeError {
  return error?.type !== undefined;
}

export function getStripeErrorMessage(error: any): string {
  if (isStripeError(error)) {
    switch (error.code) {
      case "card_declined":
        return "Your card was declined. Please try another payment method.";
      case "insufficient_funds":
        return "Your card has insufficient funds.";
      case "expired_card":
        return "Your card has expired.";
      case "incorrect_cvc":
        return "The CVC number is incorrect.";
      case "processing_error":
        return "An error occurred while processing your card. Please try again.";
      default:
        return error.message || "An unexpected error occurred.";
    }
  }

  return "An unexpected error occurred. Please try again.";
}