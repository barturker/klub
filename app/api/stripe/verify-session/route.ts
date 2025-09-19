import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items"],
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Update the order status in the database
    const supabase = await createClient();

    // First, find the order with this session ID
    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("*")
      .eq("metadata->>stripe_session_id", sessionId)
      .single();

    if (order && session.payment_status === "paid") {
      // Update existing order
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "completed",
          stripe_payment_intent_id: session.payment_intent as string,
          paid_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateError) {
        console.error("Error updating order:", updateError);
      }

      // Generate tickets if not already created
      const { data: existingTickets } = await supabase
        .from("tickets")
        .select("id")
        .eq("order_id", order.id);

      if (!existingTickets || existingTickets.length === 0) {
        // Parse ticket selections from metadata
        const ticketSelections = JSON.parse(session.metadata?.ticket_selections || "[]");

        for (const selection of ticketSelections) {
          for (let i = 0; i < selection.quantity; i++) {
            const ticketCode = `TKT${Date.now()}${Math.random().toString(36).substring(2, 10)}`.toUpperCase();

            await supabase.from("tickets").insert({
              order_id: order.id,
              event_id: session.metadata?.event_id,
              ticket_tier_id: selection.tierId,
              attendee_email: session.customer_email || "",
              ticket_code: ticketCode,
              status: "valid",
            });
          }
        }
      }
    }

    // Get event details from metadata
    const eventId = session.metadata?.event_id;
    let eventName = "Event";
    let ticketCount = 0;

    if (eventId) {
      const { data: event } = await supabase
        .from("events")
        .select("title")
        .eq("id", eventId)
        .single();

      if (event) {
        eventName = event.title;
      }
    }

    // Calculate total ticket count
    if (session.line_items?.data) {
      ticketCount = session.line_items.data.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      );
    }

    // Format the total amount
    const total = session.amount_total
      ? `${(session.amount_total / 100).toFixed(2)} ${session.currency?.toUpperCase()}`
      : "0.00";

    return NextResponse.json({
      success: true,
      eventName,
      ticketCount,
      total,
      sessionId,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email,
    });
  } catch (error) {
    console.error("Error verifying session:", error);
    return NextResponse.json(
      { error: "Failed to verify session" },
      { status: 500 }
    );
  }
}