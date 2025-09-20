import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  console.log("\n[DEBUG API] ===== COMPREHENSIVE ORDER DEBUG =====\n");

  try {
    const supabase = await createClient();

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    console.log("[DEBUG API] Current user:", user?.email || "none");

    // 2. Get ALL orders
    console.log("\n[DEBUG API] Fetching ALL orders...");
    const { data: allOrders, error: allError, count } = await supabase
      .from("orders")
      .select("*, events(*)", { count: 'exact' });

    console.log("[DEBUG API] All orders result:", {
      count: count,
      dataLength: allOrders?.length,
      error: allError?.message
    });

    // 3. Group by status
    const statusGroups: Record<string, any[]> = {};
    allOrders?.forEach(order => {
      if (!statusGroups[order.status]) {
        statusGroups[order.status] = [];
      }
      statusGroups[order.status].push(order);
    });

    console.log("\n[DEBUG API] Orders by status:");
    Object.entries(statusGroups).forEach(([status, orders]) => {
      console.log(`   ${status}: ${orders.length} orders`);
    });

    // 4. Show pending order details
    const pendingOrders = statusGroups.pending || [];
    console.log("\n[DEBUG API] Pending orders details:");
    pendingOrders.forEach((order, idx) => {
      console.log(`\n   Order ${idx + 1}:`);
      console.log(`   - ID: ${order.id}`);
      console.log(`   - Order Number: ${order.order_number}`);
      console.log(`   - Amount: $${(order.amount_cents / 100).toFixed(2)}`);
      console.log(`   - Email: ${order.buyer_email}`);
      console.log(`   - Event: ${order.events?.title || 'N/A'}`);
      console.log(`   - Stripe Session: ${order.metadata?.stripe_session_id || order.stripe_session_id || 'none'}`);
    });

    // 5. Try to update first pending order to PAID (SIMULATION)
    if (pendingOrders.length > 0) {
      const orderToUpdate = pendingOrders[0];
      console.log(`\n[DEBUG API] SIMULATING: Updating order ${orderToUpdate.order_number} to PAID...`);

      const { data: updatedOrder, error: updateError } = await supabase
        .from("orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: "card",
          metadata: {
            ...orderToUpdate.metadata,
            debug_updated: true,
            updated_at: new Date().toISOString()
          }
        })
        .eq("id", orderToUpdate.id)
        .select()
        .single();

      if (updateError) {
        console.error("[DEBUG API] Update failed:", updateError);
      } else {
        console.log("[DEBUG API] Order updated successfully!");
        console.log("[DEBUG API] New status:", updatedOrder?.status);

        // Generate ticket
        const ticketCode = `TKT${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`.toUpperCase();

        const { data: ticket, error: ticketError } = await supabase
          .from("tickets")
          .insert({
            order_id: updatedOrder.id,
            event_id: updatedOrder.event_id,
            user_id: updatedOrder.buyer_id || user?.id,
            ticket_number: ticketCode,
            status: "active",
            purchase_date: new Date().toISOString(),
            qr_code: ticketCode,
            metadata: {
              debug_created: true
            }
          })
          .select()
          .single();

        if (ticketError) {
          console.error("[DEBUG API] Ticket creation failed:", ticketError);
        } else {
          console.log("[DEBUG API] Ticket created:", ticket?.ticket_number);
        }
      }
    }

    // 6. Check tickets
    console.log("\n[DEBUG API] Checking tickets...");
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("*")
      .limit(10);

    console.log("[DEBUG API] Tickets found:", tickets?.length || 0);
    if (tickets && tickets.length > 0) {
      tickets.forEach(ticket => {
        console.log(`   - ${ticket.ticket_number} (Order: ${ticket.order_id?.slice(0, 8)}...)`);
      });
    }

    return NextResponse.json({
      message: "Debug complete - check server logs",
      stats: {
        total_orders: allOrders?.length || 0,
        pending: pendingOrders.length,
        paid: statusGroups.paid?.length || 0,
        tickets: tickets?.length || 0
      },
      pending_orders: pendingOrders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        amount_cents: o.amount_cents,
        status: o.status
      }))
    });

  } catch (error) {
    console.error("[DEBUG API] Error:", error);
    return NextResponse.json({
      error: "Debug failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}