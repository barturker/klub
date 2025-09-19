import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";

async function generateUniqueTicketCode(supabase: any): Promise<string> {
  let ticketCode: string;
  let exists = true;

  while (exists) {
    // Generate a random ticket code
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    ticketCode = `TKT${timestamp}${random}`;

    // Check if it already exists
    const { data } = await supabase
      .from("tickets")
      .select("id")
      .eq("ticket_code", ticketCode)
      .single();

    exists = !!data;
  }

  return ticketCode!;
}

export async function POST(request: NextRequest) {
  try {
    const { order_id, payment_intent_id } = await request.json();

    if (!order_id || !payment_intent_id) {
      return NextResponse.json(
        { error: "Order ID and Payment Intent ID are required" },
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
        events (
          id,
          name,
          slug,
          start_at,
          location
        ),
        ticket_tiers (
          id,
          name,
          description
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

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        {
          success: false,
          status: paymentIntent.status,
          error: "Payment not completed"
        },
        { status: 400 }
      );
    }

    // Check if order is already completed
    if (order.status === "completed") {
      // Get existing tickets
      const { data: tickets } = await supabase
        .from("tickets")
        .select("*")
        .eq("order_id", order_id);

      return NextResponse.json({
        success: true,
        order,
        tickets: tickets || [],
        receipt_url: paymentIntent.charges?.data[0]?.receipt_url || null,
        message: "Order already completed",
      });
    }

    // Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "completed",
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntent.id,
        stripe_charge_id: paymentIntent.latest_charge as string,
        payment_method: paymentIntent.payment_method_types?.[0] || "card",
      })
      .eq("id", order_id);

    if (updateError) {
      console.error("Error updating order:", updateError);
      return NextResponse.json(
        { error: "Failed to update order status" },
        { status: 500 }
      );
    }

    // Generate tickets
    const tickets = [];
    for (let i = 0; i < order.quantity; i++) {
      const ticketCode = await generateUniqueTicketCode(supabase);

      const ticketData = {
        order_id: order.id,
        event_id: order.event_id,
        ticket_tier_id: order.ticket_tier_id,
        attendee_email: order.buyer_email || user.email,
        attendee_name: order.buyer_name || "",
        ticket_code: ticketCode,
        status: "valid",
        metadata: {
          tier_name: order.ticket_tiers?.name,
          event_name: order.events?.name,
          purchase_date: new Date().toISOString(),
        },
      };

      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert(ticketData)
        .select()
        .single();

      if (ticketError) {
        console.error("Error creating ticket:", ticketError);
      } else {
        tickets.push(ticket);
      }
    }

    // Update payment intent record
    await supabase
      .from("payment_intents")
      .update({
        status: paymentIntent.status,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_payment_intent_id", payment_intent_id);

    // Get receipt URL from Stripe
    const receiptUrl = paymentIntent.charges?.data[0]?.receipt_url || null;

    // TODO: Send confirmation email with tickets

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        status: "completed",
      },
      tickets,
      receipt_url: receiptUrl,
      event: order.events,
      ticket_tier: order.ticket_tiers,
    });
  } catch (error) {
    console.error("Error confirming payment:", error);
    return NextResponse.json(
      { error: "Failed to confirm payment" },
      { status: 500 }
    );
  }
}