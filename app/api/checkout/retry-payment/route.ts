import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, generateIdempotencyKey } from "@/lib/stripe/server";

export async function POST(request: NextRequest) {
  try {
    const { order_id, payment_method_id } = await request.json();

    if (!order_id || !payment_method_id) {
      return NextResponse.json(
        { error: "Order ID and Payment Method ID are required" },
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

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        payment_intents (
          stripe_payment_intent_id
        )
      `)
      .eq("id", order_id)
      .eq("buyer_id", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Check if order can be retried
    if (!["failed", "pending", "processing"].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot retry payment for order with status: ${order.status}` },
        { status: 400 }
      );
    }

    let paymentIntentId = order.stripe_payment_intent_id;

    // If no payment intent exists, check the payment_intents table
    if (!paymentIntentId && order.payment_intents?.length > 0) {
      paymentIntentId = order.payment_intents[0].stripe_payment_intent_id;
    }

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "No payment intent found for this order" },
        { status: 400 }
      );
    }

    try {
      // Retrieve the payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      // Check if payment intent can be retried
      if (paymentIntent.status === "succeeded") {
        return NextResponse.json(
          { error: "Payment has already succeeded" },
          { status: 400 }
        );
      }

      if (paymentIntent.status === "canceled") {
        return NextResponse.json(
          { error: "Payment has been canceled and cannot be retried" },
          { status: 400 }
        );
      }

      // Update payment method
      const updatedIntent = await stripe.paymentIntents.update(
        paymentIntentId,
        {
          payment_method: payment_method_id,
        },
        {
          idempotencyKey: generateIdempotencyKey(),
        }
      );

      // Attempt to confirm the payment again
      const confirmedIntent = await stripe.paymentIntents.confirm(
        paymentIntentId,
        {
          payment_method: payment_method_id,
        },
        {
          idempotencyKey: generateIdempotencyKey(),
        }
      );

      // Update order status based on payment intent status
      let newStatus = "processing";
      if (confirmedIntent.status === "succeeded") {
        newStatus = "completed";
      } else if (confirmedIntent.status === "requires_action") {
        newStatus = "processing";
      }

      // Update order in database
      await supabase
        .from("orders")
        .update({
          status: newStatus,
          payment_method: payment_method_id,
          metadata: {
            ...order.metadata,
            last_retry_at: new Date().toISOString(),
            retry_count: (order.metadata?.retry_count || 0) + 1,
          },
        })
        .eq("id", order_id);

      // Update payment intent record
      await supabase
        .from("payment_intents")
        .update({
          status: confirmedIntent.status,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", order_id);

      return NextResponse.json({
        client_secret: confirmedIntent.client_secret,
        status: confirmedIntent.status,
        requires_action: confirmedIntent.status === "requires_action",
        retry_count: (order.metadata?.retry_count || 0) + 1,
      });
    } catch (stripeError: any) {
      console.error("Stripe error during retry:", stripeError);

      // Update order with failure information
      await supabase
        .from("orders")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          metadata: {
            ...order.metadata,
            last_error: stripeError.message,
            last_error_code: stripeError.code,
            failed_retry_at: new Date().toISOString(),
          },
        })
        .eq("id", order_id);

      return NextResponse.json(
        {
          error: stripeError.message || "Payment retry failed",
          code: stripeError.code,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error retrying payment:", error);
    return NextResponse.json(
      { error: "Failed to retry payment" },
      { status: 500 }
    );
  }
}