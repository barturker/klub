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
    const { amount, currency = "usd", description, metadata, eventId } = await request.json();

    // Validate amount
    if (!amount || amount < 50) {
      return NextResponse.json(
        { error: "Amount must be at least $0.50 (50 cents)" },
        { status: 400 }
      );
    }

    // Validate event ID
    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
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

    // Calculate fees
    const platformFee = Math.ceil(amount * 0.03); // 3% platform fee
    const stripeFee = Math.ceil(amount * 0.029) + 30; // 2.9% + 30 cents
    const totalFee = platformFee + stripeFee;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // Amount in cents
      currency,
      automatic_payment_methods: {
        enabled: true, // Automatically enables cards, Apple Pay, Google Pay, etc.
      },
      description: description || "Klub Event Ticket",
      metadata: {
        ...metadata,
        user_id: user.id,
        user_email: user.email || "",
        platform_fee: platformFee.toString(),
        stripe_fee: stripeFee.toString(),
        total_fee: totalFee.toString(),
        test_mode: "true", // Indicate this is test mode
      },
    });

    // Create order record in database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        event_id: eventId, // Use the event ID from request
        buyer_id: user.id,
        amount_cents: amount,
        currency,
        status: "pending",
        quantity: 1, // Required field
        metadata: {
          buyer_email: user.email || "",
          stripe_payment_intent_id: paymentIntent.id,
          platform_fee: platformFee,
          stripe_fee: stripeFee,
          total_fee: totalFee,
          test_order: true, // Mark as test
          ...metadata,
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
      amount,
      platformFee,
      stripeFee,
      totalFee,
      netAmount: amount - totalFee,
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