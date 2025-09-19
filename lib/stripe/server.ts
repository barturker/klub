import Stripe from "stripe";
import { dinero, add, multiply, toDecimal } from "dinero.js";
import { USD } from "@dinero.js/currencies";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

export const PLATFORM_FEE_PERCENTAGE = 0.03; // 3%
export const STRIPE_FEE_PERCENTAGE = 0.029; // 2.9%
export const STRIPE_FEE_FIXED_CENTS = 30; // 30 cents

export interface FeeCalculation {
  platformFee: number;
  stripeFee: number;
  totalFee: number;
  netAmount: number;
  grossAmount: number;
}

export function calculateFees(amountCents: number): FeeCalculation {
  const grossAmount = dinero({ amount: amountCents, currency: USD });

  // Platform fee: 3% of gross amount
  const platformFee = multiply(grossAmount, {
    amount: Math.round(PLATFORM_FEE_PERCENTAGE * 10000),
    scale: 4
  });

  // Stripe fee: 2.9% + 30 cents
  const stripePercentage = multiply(grossAmount, {
    amount: Math.round(STRIPE_FEE_PERCENTAGE * 10000),
    scale: 4
  });
  const stripeFixed = dinero({ amount: STRIPE_FEE_FIXED_CENTS, currency: USD });
  const stripeFee = add(stripePercentage, stripeFixed);

  // Total fees
  const totalFee = add(platformFee, stripeFee);

  // Net amount (what organizer receives)
  const netAmount = add(grossAmount, multiply(totalFee, { amount: -1, scale: 0 }));

  return {
    platformFee: Number(toDecimal(platformFee)) * 100,
    stripeFee: Number(toDecimal(stripeFee)) * 100,
    totalFee: Number(toDecimal(totalFee)) * 100,
    netAmount: Number(toDecimal(netAmount)) * 100,
    grossAmount: amountCents,
  };
}

export async function createStripeConnectAccount(
  email: string,
  businessType: "individual" | "company" = "individual",
  country: string = "US"
): Promise<Stripe.Account> {
  const account = await stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: businessType,
    country,
  });

  return account;
}

export async function createAccountLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<Stripe.AccountLink> {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: "account_onboarding",
  });

  return accountLink;
}

export async function retrieveAccount(
  accountId: string
): Promise<Stripe.Account> {
  return await stripe.accounts.retrieve(accountId);
}

export async function createPaymentIntent(
  amountCents: number,
  stripeAccountId?: string,
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  const fees = calculateFees(amountCents);

  const params: Stripe.PaymentIntentCreateParams = {
    amount: amountCents,
    currency: "usd",
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: {
      platform_fee: fees.platformFee.toString(),
      stripe_fee: fees.stripeFee.toString(),
      net_amount: fees.netAmount.toString(),
      ...metadata,
    },
  };

  // If this is for a connected account (marketplace model)
  // Only apply application fees if we have a valid connected account
  if (stripeAccountId && stripeAccountId.startsWith('acct_')) {
    params.application_fee_amount = fees.platformFee;
    params.on_behalf_of = stripeAccountId;
    params.transfer_data = {
      destination: stripeAccountId,
    };
  }

  return await stripe.paymentIntents.create(params);
}

export async function confirmPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  return await stripe.paymentIntents.confirm(paymentIntentId);
}

export async function cancelPaymentIntent(
  paymentIntentId: string,
  reason?: string
): Promise<Stripe.PaymentIntent> {
  return await stripe.paymentIntents.cancel(paymentIntentId, {
    cancellation_reason: reason as Stripe.PaymentIntentCancelParams.CancellationReason,
  });
}

export async function createRefund(
  paymentIntentId: string,
  amountCents?: number,
  reason?: string
): Promise<Stripe.Refund> {
  const params: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
  };

  if (amountCents) {
    params.amount = amountCents;
  }

  if (reason) {
    params.reason = reason as Stripe.RefundCreateParams.Reason;
  }

  return await stripe.refunds.create(params);
}

export async function createPayout(
  stripeAccountId: string,
  amountCents: number,
  currency: string = "usd"
): Promise<Stripe.Payout> {
  return await stripe.payouts.create(
    {
      amount: amountCents,
      currency,
      method: "instant",
      source_type: "card",
    },
    {
      stripeAccount: stripeAccountId,
    }
  );
}

export async function getBalance(
  stripeAccountId: string
): Promise<Stripe.Balance> {
  return await stripe.balance.retrieve({
    stripeAccount: stripeAccountId,
  });
}

export async function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Promise<Stripe.Event> {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

export function generateIdempotencyKey(): string {
  return `idempotency_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

export interface PaymentMethodDetails {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export async function retrievePaymentMethod(
  paymentMethodId: string
): Promise<PaymentMethodDetails> {
  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

  return {
    id: paymentMethod.id,
    type: paymentMethod.type,
    card: paymentMethod.card ? {
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      expMonth: paymentMethod.card.exp_month,
      expYear: paymentMethod.card.exp_year,
    } : undefined,
  };
}