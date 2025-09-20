import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  console.log("[WEBHOOK SIM] ===== SIMULATING CHECKOUT SESSION COMPLETED =====");

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

    console.log("[WEBHOOK SIM] Current order:", {
      id: order?.id,
      status: order?.status,
      amount: order?.amount_cents,
      email: order?.buyer_email,
      metadata: order?.metadata
    });

    if (fetchError || !order) {
      console.error("[WEBHOOK SIM] Order not found:", fetchError);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Simulate what webhook would do - update order to paid
    console.log("[WEBHOOK SIM] Updating order to PAID status...");

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        stripe_session_id: order.metadata?.stripe_session_id || "sim_session_" + Date.now(),
        payment_method: "card",
        metadata: {
          ...order.metadata,
          webhook_simulated: true,
          webhook_processed_at: new Date().toISOString(),
          payment_completed: true
        }
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      console.error("[WEBHOOK SIM] Update failed:", updateError);
      return NextResponse.json({
        error: "Failed to update order",
        details: updateError
      }, { status: 500 });
    }

    console.log("[WEBHOOK SIM] Order updated successfully:", {
      id: updatedOrder?.id,
      status: updatedOrder?.status,
      paid_at: updatedOrder?.paid_at
    });

    // Generate ticket
    const ticketCode = `TKT${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`.toUpperCase();

    console.log("[WEBHOOK SIM] Creating ticket:", ticketCode);

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        order_id: updatedOrder.id,
        event_id: updatedOrder.event_id,
        user_id: updatedOrder.buyer_id,
        ticket_number: ticketCode,
        status: "active",
        purchase_date: new Date().toISOString(),
        qr_code: ticketCode,
        metadata: {
          created_from_simulation: true,
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (ticketError) {
      console.error("[WEBHOOK SIM] Ticket creation failed:", ticketError);
      return NextResponse.json({
        message: "Order updated but ticket creation failed",
        order: updatedOrder,
        ticketError: ticketError.message
      });
    }

    console.log("[WEBHOOK SIM] Ticket created:", ticket?.id);

    return NextResponse.json({
      message: "Webhook simulation successful",
      order: updatedOrder,
      ticket: {
        id: ticket?.id,
        ticket_number: ticket?.ticket_number
      }
    });

  } catch (error) {
    console.error("[WEBHOOK SIM] Error:", error);
    return NextResponse.json({
      error: "Internal error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log("[WEBHOOK SIM] ===== LISTING ORDERS FOR SIMULATION =====");

  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, status, amount_cents, buyer_email, created_at, event_id, metadata")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(10);

  console.log("[WEBHOOK SIM] Pending orders found:", orders?.length || 0);

  if (error) {
    console.error("[WEBHOOK SIM] Error fetching orders:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Pending orders that can be simulated",
    orders: orders?.map(o => ({
      id: o.id,
      status: o.status,
      amount: o.amount_cents,
      email: o.buyer_email,
      created: o.created_at,
      session_id: o.metadata?.stripe_session_id
    }))
  });
}