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

    // Get the order from our database
    const supabase = await createClient();

    // Find order by Stripe session ID
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        event:events(
          id,
          title,
          start_at,
          location,
          slug,
          community:communities(
            name,
            slug
          )
        )
      `)
      .eq("metadata->>stripe_session_id", sessionId)
      .single();

    let tickets = [];

    if (order) {
      // First check if we need to update order status and generate tickets
      if (session.payment_status === "paid" && order.status !== "paid") {
        console.log("Payment confirmed but order not updated yet. Processing now...");

        // Process the payment and generate tickets immediately
        const { data: processResult, error: processError } = await supabase
          .rpc('process_successful_payment', {
            p_session_id: sessionId,
            p_payment_intent_id: session.payment_intent as string
          });

        if (processError) {
          console.error("Error processing payment:", processError);
        } else if (processResult?.success) {
          console.log("Payment processed and tickets generated:", processResult);
        }
      }

      // Now get the tickets for this order
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("tickets")
        .select("*")
        .eq("order_id", order.id);

      if (ticketsData && ticketsData.length > 0) {
        tickets = ticketsData;
        console.log(`Found ${tickets.length} tickets for order ${order.id}`);
      } else {
        console.log("No tickets found yet for order:", order.id);
      }
    }

    // Format the response
    if (order && order.event) {
      return NextResponse.json({
        success: true,
        sessionId,
        orderId: order.id,
        eventName: order.event.title,
        eventDate: order.event.start_at,
        eventLocation: order.event.location,
        eventSlug: order.event.slug,
        communityName: order.event.community?.name,
        communitySlug: order.event.community?.slug,
        ticketCount: order.quantity,
        total: `${(order.amount_cents || 0) / 100} ${order.currency?.toUpperCase()}`,
        customerEmail: order.buyer_email,
        customerName: order.buyer_name,
        paymentStatus: session.payment_status,
        orderStatus: order.status,
        tickets: tickets.map(ticket => ({
          id: ticket.id,
          ticketNumber: ticket.ticket_number,
          qrCode: ticket.qr_code,
          attendeeName: ticket.attendee_name,
          attendeeEmail: ticket.attendee_email,
          status: ticket.status,
          ticketType: ticket.ticket_type
        }))
      });
    }

    // Fallback to basic session info if order not found
    return NextResponse.json({
      success: true,
      sessionId,
      eventName: session.metadata?.event_name || "Event",
      ticketCount: parseInt(session.metadata?.ticket_count || "1"),
      total: `${(session.amount_total || 0) / 100} ${session.currency?.toUpperCase()}`,
      customerEmail: session.customer_email || session.customer_details?.email || "",
      paymentStatus: session.payment_status,
      tickets: []
    });
  } catch (error) {
    console.error("Error verifying session:", error);
    return NextResponse.json(
      { error: "Failed to verify session" },
      { status: 500 }
    );
  }
}