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
    const { error: updateError } = await supabase
      .from("ticket_orders")
      .update({
        status: "completed",
        stripe_payment_intent_id: session.payment_intent,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_session_id", sessionId);

    if (updateError) {
      console.error("Error updating order:", updateError);
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