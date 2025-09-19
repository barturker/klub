import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPaymentIntent, calculateFees } from "@/lib/stripe/server";

export async function POST(request: NextRequest) {
  try {
    const {
      event_id,
      ticket_tier_id,
      quantity,
      discount_code,
      buyer_email,
      buyer_name,
    } = await request.json();

    // Validate required fields
    if (!event_id || !ticket_tier_id || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (quantity < 1 || quantity > 10) {
      return NextResponse.json(
        { error: "Quantity must be between 1 and 10" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get ticket tier details
    const { data: ticketTier, error: tierError } = await supabase
      .from("ticket_tiers")
      .select(`
        *,
        events (
          id,
          name,
          community_id,
          status
        )
      `)
      .eq("id", ticket_tier_id)
      .single();

    if (tierError || !ticketTier) {
      return NextResponse.json(
        { error: "Ticket tier not found" },
        { status: 404 }
      );
    }

    // Verify event is published and tickets are available
    if (ticketTier.events?.status !== "published") {
      return NextResponse.json(
        { error: "Event is not available for purchase" },
        { status: 400 }
      );
    }

    // Check ticket availability
    if (ticketTier.max_quantity) {
      // Count existing tickets for this tier
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("ticket_tier_id", ticket_tier_id)
        .in("status", ["valid", "used"]);

      if (count && count + quantity > ticketTier.max_quantity) {
        return NextResponse.json(
          { error: "Not enough tickets available" },
          { status: 400 }
        );
      }
    }

    // Calculate total amount
    const unitPriceCents = ticketTier.price_cents || 0;
    let totalAmountCents = unitPriceCents * quantity;

    // Apply discount if provided
    let discountAmount = 0;
    if (discount_code) {
      // TODO: Implement discount code logic
      // For now, we'll skip discount implementation
    }

    totalAmountCents -= discountAmount;

    // Ensure minimum amount (50 cents for Stripe)
    if (totalAmountCents < 50) {
      return NextResponse.json(
        { error: "Minimum amount is $0.50" },
        { status: 400 }
      );
    }

    // Calculate fees
    const fees = calculateFees(totalAmountCents);

    // Check if community has Stripe account
    const { data: stripeAccount } = await supabase
      .from("stripe_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("community_id", ticketTier.events?.community_id)
      .single();

    // Create payment intent
    const paymentIntent = await createPaymentIntent(
      totalAmountCents,
      stripeAccount?.charges_enabled ? stripeAccount.stripe_account_id : undefined,
      {
        event_id,
        ticket_tier_id,
        quantity: quantity.toString(),
        buyer_id: user.id,
        buyer_email: buyer_email || user.email || "",
        buyer_name: buyer_name || "",
      }
    );

    // Create order record
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        event_id,
        buyer_id: user.id,
        ticket_tier_id,
        quantity,
        amount_cents: totalAmountCents,
        fee_cents: fees.totalFee,
        currency: "usd",
        status: "pending",
        stripe_payment_intent_id: paymentIntent.id,
        buyer_email: buyer_email || user.email || "",
        buyer_name: buyer_name || "",
        metadata: {
          platform_fee: fees.platformFee,
          stripe_fee: fees.stripeFee,
          net_amount: fees.netAmount,
          discount_amount: discountAmount,
          discount_code,
        },
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      // Cancel payment intent if order creation fails
      try {
        await cancelPaymentIntent(paymentIntent.id);
      } catch (cancelError) {
        console.error("Error canceling payment intent:", cancelError);
      }
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // Create order items
    await supabase.from("order_items").insert({
      order_id: order.id,
      ticket_tier_id,
      quantity,
      unit_price_cents: unitPriceCents,
      discount_cents: discountAmount / quantity,
    });

    // Store payment intent in database for tracking
    await supabase.from("payment_intents").insert({
      order_id: order.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_account_id: stripeAccount?.stripe_account_id || "",
      amount_cents: totalAmountCents,
      currency: "usd",
      status: paymentIntent.status,
      payment_method_types: paymentIntent.payment_method_types || ["card"],
      metadata: {
        ...paymentIntent.metadata,
      },
    });

    return NextResponse.json({
      order_id: order.id,
      client_secret: paymentIntent.client_secret,
      amount_cents: totalAmountCents,
      fee_cents: fees.totalFee,
      platform_fee: fees.platformFee,
      stripe_fee: fees.stripeFee,
      net_amount: fees.netAmount,
      currency: "usd",
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}

// Helper function to cancel payment intent (imported from server.ts)
import { cancelPaymentIntent } from "@/lib/stripe/server";