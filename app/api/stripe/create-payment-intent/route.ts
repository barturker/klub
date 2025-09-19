import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

// Initialize Stripe with test key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const { eventId, tierId, quantity = 1 } = await request.json();

    // Validate inputs
    if (!eventId || !tierId) {
      return NextResponse.json(
        { error: "Event ID and Tier ID are required" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Fetch ticket tier
    const { data: tier, error: tierError } = await supabase
      .from("ticket_tiers")
      .select("*")
      .eq("id", tierId)
      .eq("event_id", eventId)
      .single();

    if (tierError || !tier) {
      return NextResponse.json({ error: "Ticket tier not found" }, { status: 404 });
    }

    // Calculate amounts (same as checkout session)
    const subtotal = tier.price_cents * quantity;
    const platformFeePercentage = 0.059; // 5.9%
    const platformFeeFixed = 30; // 30 cents
    const platformFees = Math.round(subtotal * platformFeePercentage + platformFeeFixed);
    const totalAmount = subtotal + platformFees;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount, // Total amount including fees
      currency: "usd",
      automatic_payment_methods: {
        enabled: true, // Automatically enables cards, Apple Pay, Google Pay, etc.
      },
      description: `Ticket for ${tier.name}`,
      metadata: {
        event_id: eventId,
        tier_id: tierId,
        user_id: user.id,
        user_email: user.email || "",
        subtotal_cents: subtotal.toString(),
        platform_fee_cents: platformFees.toString(),
        quantity: quantity.toString(),
        test_mode: "true", // Indicate this is test mode
      },
    });

    // Create order record in database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        event_id: eventId,
        buyer_id: user.id,
        amount_cents: totalAmount, // Total including fees
        fee_cents: platformFees, // Platform fee amount
        currency: "usd",
        status: "pending",
        quantity: quantity,
        buyer_email: user.email || "",
        metadata: {
          stripe_payment_intent_id: paymentIntent.id,
          tier_id: tierId,
          subtotal_cents: subtotal,
          platform_fee_cents: platformFees,
          test_order: true, // Mark as test
        },
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      // Cancel the payment intent if order creation fails
      await stripe.paymentIntents.cancel(paymentIntent.id);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // Return client secret for Stripe Elements
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
      subtotal,
      platformFees,
      totalAmount,
      tierName: tier.name,
      quantity,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return test mode status
  return NextResponse.json({
    testMode: true,
    message: "Stripe Test Mode Active - Use test cards only",
    testCards: {
      success: "4242424242424242",
      decline: "4000000000009995",
      authentication: "4000002760003184",
    },
  });
}