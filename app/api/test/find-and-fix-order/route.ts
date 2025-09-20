import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  console.log("\n[FIND-FIX] ===== FINDING ORDER 94CBC9F1 =====\n");

  try {
    const supabase = await createClient();

    // Search by order number
    const orderNumber = "94CBC9F1";

    console.log("[FIND-FIX] Searching for order:", orderNumber);

    // Try different search methods
    let order = null;

    // Method 1: Direct order_number search
    const { data: orderByNumber } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", orderNumber)
      .single();

    if (orderByNumber) {
      order = orderByNumber;
      console.log("[FIND-FIX] Found by order_number!");
    }

    // Method 2: Search in all orders
    if (!order) {
      const { data: allOrders } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      console.log("[FIND-FIX] Recent orders:", allOrders?.map(o => ({
        order_number: o.order_number,
        status: o.status,
        created: o.created_at
      })));

      // Check if 94CBC9F1 is in the list
      order = allOrders?.find(o =>
        o.order_number === orderNumber ||
        o.order_number?.includes("94CBC9F1") ||
        o.metadata?.order_number === orderNumber
      );
    }

    if (!order) {
      // Try searching tickets
      console.log("[FIND-FIX] Order not found, searching tickets...");

      const { data: ticket } = await supabase
        .from("tickets")
        .select("*, orders(*)")
        .eq("ticket_number", orderNumber)
        .single();

      if (ticket) {
        console.log("[FIND-FIX] Found as ticket number!");
        order = ticket.orders;
      }
    }

    if (!order) {
      return NextResponse.json({
        error: "Order/Ticket not found",
        searched_for: orderNumber,
        message: "Could not find order with number 94CBC9F1"
      }, { status: 404 });
    }

    console.log("[FIND-FIX] Order found:", {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      amount: order.amount_cents,
      created: order.created_at
    });

    // Update to PAID if it's pending
    if (order.status === "pending") {
      console.log("[FIND-FIX] Order is pending, updating to PAID...");

      const { data: updated, error: updateError } = await supabase
        .from("orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: "card",
          metadata: {
            ...order.metadata,
            manually_fixed: true,
            fixed_at: new Date().toISOString(),
            fixed_reason: "manual_fix_94CBC9F1"
          }
        })
        .eq("id", order.id)
        .select()
        .single();

      if (updateError) {
        console.error("[FIND-FIX] Update failed:", updateError);
        return NextResponse.json({
          error: "Failed to update order",
          details: updateError
        }, { status: 500 });
      }

      console.log("[FIND-FIX] Order updated to PAID!");

      // Generate ticket
      const ticketCode = `TKT${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`.toUpperCase();

      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          order_id: order.id,
          event_id: order.event_id,
          user_id: order.buyer_id,
          ticket_number: ticketCode,
          status: "active",
          purchase_date: new Date().toISOString(),
          qr_code: ticketCode,
          metadata: {
            manually_created: true,
            original_request: "94CBC9F1"
          }
        })
        .select()
        .single();

      if (ticketError) {
        console.error("[FIND-FIX] Ticket creation failed:", ticketError);
      } else {
        console.log("[FIND-FIX] Ticket created:", ticketCode);
      }

      return NextResponse.json({
        success: true,
        message: "Order found and updated to PAID",
        order: {
          id: updated.id,
          order_number: updated.order_number,
          status: updated.status,
          paid_at: updated.paid_at
        },
        ticket: ticket ? {
          ticket_number: ticket.ticket_number,
          status: ticket.status
        } : null
      });
    } else {
      return NextResponse.json({
        message: "Order found but already processed",
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          paid_at: order.paid_at
        }
      });
    }

  } catch (error) {
    console.error("[FIND-FIX] Error:", error);
    return NextResponse.json({
      error: "Internal error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}