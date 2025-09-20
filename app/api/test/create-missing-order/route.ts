import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  console.log("\n[CREATE ORDER] ===== CREATING MISSING ORDER FROM STRIPE =====\n");

  try {
    const supabase = await createClient();

    // Stripe session data from the event
    const sessionData = {
      session_id: "cs_test_b1vrfCNZ13reAGAac7jyW91RbHftTOzPNaRXWBdLKS5rWGuMAt2BWn2sIu",
      payment_intent: "pi_3S9N18Fw4Rw8sFYf0cJylbfs",
      amount_total: 52980,
      customer_email: "barturker@gmail.com",
      customer_name: "Ali Bartu Türker",
      event_id: "3a636d35-2cc0-43e4-b892-bf3c8f262d23",
      user_id: "4e91b95a-a446-4668-90c4-aec5698eeff8",
      community_id: "425ed2b0-f1fb-49a0-97b0-08da0d3901b0",
      ticket_selections: JSON.parse("[{\"tierId\":\"3a455c95-aa0c-470d-b798-d9ffd4f0d609\",\"quantity\":1,\"subtotal\":50000}]")
    };

    // First check if order already exists
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("metadata->>stripe_session_id", sessionData.session_id)
      .single();

    if (existingOrder) {
      console.log("[CREATE ORDER] Order already exists:", existingOrder.id);
      return NextResponse.json({
        message: "Order already exists",
        order: existingOrder
      });
    }

    // Generate order number (this might be 94CBC9F1 you mentioned)
    const orderNumber = `94CBC9F1`; // Using the number you provided

    // Calculate fees (5.96% platform fee)
    const platformFeeRate = 0.0596;
    const platformFee = Math.round(sessionData.amount_total * platformFeeRate);

    // Create the order
    const { data: newOrder, error: createError } = await supabase
      .from("orders")
      .insert({
        event_id: sessionData.event_id,
        buyer_id: sessionData.user_id,
        buyer_email: sessionData.customer_email,
        buyer_name: sessionData.customer_name,
        status: "paid", // Set directly to paid since payment succeeded
        amount_cents: sessionData.amount_total,
        fee_cents: platformFee,
        currency: "usd",
        provider: "stripe",
        provider_ref: sessionData.payment_intent,
        payment_method: "card",
        paid_at: new Date().toISOString(),
        metadata: {
          order_number: orderNumber,
          stripe_session_id: sessionData.session_id,
          payment_intent_id: sessionData.payment_intent,
          ticket_selections: sessionData.ticket_selections,
          created_from_missing: true,
          created_at: new Date().toISOString()
        },
        quantity: 1
      })
      .select()
      .single();

    if (createError) {
      console.error("[CREATE ORDER] Failed to create order:", createError);
      return NextResponse.json({
        error: "Failed to create order",
        details: createError
      }, { status: 500 });
    }

    console.log("[CREATE ORDER] Order created successfully:", newOrder.id);

    // Generate ticket
    const ticketCode = `TKT${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`.toUpperCase();

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        order_id: newOrder.id,
        event_id: newOrder.event_id,
        user_id: newOrder.buyer_id,
        ticket_number: ticketCode,
        status: "active",
        purchase_date: new Date().toISOString(),
        qr_code: ticketCode,
        metadata: {
          created_from_missing_order: true,
          stripe_session_id: sessionData.session_id
        }
      })
      .select()
      .single();

    if (ticketError) {
      console.error("[CREATE ORDER] Failed to create ticket:", ticketError);
    } else {
      console.log("[CREATE ORDER] Ticket created:", ticket.ticket_number);
    }

    return NextResponse.json({
      success: true,
      message: "Order created and marked as paid",
      order: {
        id: newOrder.id,
        order_number: orderNumber,
        status: newOrder.status,
        amount_cents: newOrder.amount_cents,
        paid_at: newOrder.paid_at
      },
      ticket: ticket ? {
        ticket_number: ticket.ticket_number,
        status: ticket.status
      } : null
    });

  } catch (error) {
    console.error("[CREATE ORDER] Error:", error);
    return NextResponse.json({
      error: "Internal error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}