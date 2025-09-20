import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

// This endpoint creates a fake Stripe event and sends it to our webhook
// to test the real webhook processing flow

export async function POST(request: NextRequest) {
  console.log("[REAL WEBHOOK TEST] ===== TESTING REAL WEBHOOK ENDPOINT =====");

  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the order
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    console.log("[REAL WEBHOOK TEST] Order found:", {
      id: order?.id,
      order_number: order?.order_number,
      status: order?.status,
      metadata: order?.metadata,
    });

    if (fetchError || !order) {
      console.error("[REAL WEBHOOK TEST] Order not found:", fetchError);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Create a fake Stripe checkout.session.completed event
    const fakeEvent: Stripe.Event = {
      id: `evt_test_${Date.now()}`,
      object: "event",
      api_version: "2024-12-18.acacia" as any,
      created: Math.floor(Date.now() / 1000),
      type: "checkout.session.completed",
      livemode: false,
      pending_webhooks: 0,
      request: null,
      data: {
        object: {
          id: order.metadata?.stripe_session_id || `cs_test_${Date.now()}`,
          object: "checkout.session",
          payment_status: "paid",
          payment_intent: `pi_test_${Date.now()}`,
          customer_email: order.buyer_email,
          customer_details: {
            email: order.buyer_email,
            name: order.buyer_name,
          },
          amount_total: order.amount_cents,
          amount_subtotal: order.amount_cents - order.fee_cents,
          currency: "usd",
          mode: "payment",
          status: "complete",
          success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
          metadata: {
            ...order.metadata,
            order_id: order.id,
          },
          payment_method_types: ["card"],
          created: Math.floor(Date.now() / 1000),
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          livemode: false,
        } as any,
      },
    };

    console.log("[REAL WEBHOOK TEST] Sending fake event to webhook:", {
      eventId: fakeEvent.id,
      eventType: fakeEvent.type,
      sessionId: (fakeEvent.data.object as any).id,
    });

    // Send the fake event to our webhook endpoint
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/stripe/webhook`;

    // Create a test signature (this will only work if webhook signature verification is disabled for test mode)
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let testSignature = "test_signature";

    if (webhookSecret) {
      // For testing, we'll bypass signature verification by using a special test header
      testSignature = "t=0,v1=test_mode_signature,v0=test";
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": testSignature,
        "x-test-mode": "true", // Special header to indicate test mode
      },
      body: JSON.stringify(fakeEvent),
    });

    const responseText = await response.text();
    console.log("[REAL WEBHOOK TEST] Webhook response:", {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    });

    if (!response.ok) {
      console.error("[REAL WEBHOOK TEST] Webhook returned error:", responseText);

      // If signature verification failed, try the simulate endpoint instead
      if (responseText.includes("signature") || responseText.includes("Invalid")) {
        console.log("[REAL WEBHOOK TEST] Signature verification failed, using simulation fallback");

        const simulateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/test/simulate-webhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });

        const simulateResult = await simulateResponse.json();

        return NextResponse.json({
          message: "Webhook signature verification is active. Used simulation fallback.",
          fallbackUsed: true,
          order: simulateResult.order,
          ticket: simulateResult.ticket,
        });
      }

      return NextResponse.json({
        error: "Webhook processing failed",
        details: responseText,
      }, { status: 500 });
    }

    // Check if the order was updated
    const { data: updatedOrder } = await supabase
      .from("orders")
      .select("*, tickets(*)")
      .eq("id", orderId)
      .single();

    console.log("[REAL WEBHOOK TEST] Order after webhook:", {
      id: updatedOrder?.id,
      status: updatedOrder?.status,
      paid_at: updatedOrder?.paid_at,
      tickets: updatedOrder?.tickets?.length || 0,
    });

    return NextResponse.json({
      message: "Real webhook test completed",
      order: updatedOrder,
      webhookResponse: {
        status: response.status,
        body: responseText,
      },
    });
  } catch (error) {
    console.error("[REAL WEBHOOK TEST] Error:", error);
    return NextResponse.json({
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}