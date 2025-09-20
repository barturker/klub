import { NextResponse } from "next/server";

export async function GET() {
  console.log("[WEBHOOK CONFIG CHECK] ===== CHECKING WEBHOOK CONFIGURATION =====");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const hasWebhookSecret = !!webhookSecret && webhookSecret.length > 0;

  console.log("[WEBHOOK CONFIG CHECK] STRIPE_WEBHOOK_SECRET status:", {
    exists: hasWebhookSecret,
    length: webhookSecret?.length || 0,
    startsWithWhsec: webhookSecret?.startsWith("whsec_") || false,
  });

  // Check other Stripe configuration
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  const config = {
    hasWebhookSecret,
    webhookSecretConfigured: hasWebhookSecret && webhookSecret.startsWith("whsec_"),
    hasStripeSecretKey: !!stripeSecretKey,
    hasStripePublishableKey: !!stripePublishableKey,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };

  console.log("[WEBHOOK CONFIG CHECK] Full configuration:", config);

  return NextResponse.json(config);
}