import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { orderId } = await request.json();

  if (!orderId) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Get the order details
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(`
      *,
      events (
        id,
        title
      )
    `)
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({
      error: "Order not found",
      details: orderError?.message
    }, { status: 404 });
  }

  // Create sample tickets for this order
  const ticketsToCreate = [
    {
      event_id: order.event_id,
      user_id: order.buyer_id,
      order_id: orderId,
      amount: 50.00,
      currency: "USD",
      status: "valid",
      qr_code: `TICKET-${orderId.slice(0, 8)}-001`.toUpperCase(),
    },
    {
      event_id: order.event_id,
      user_id: order.buyer_id,
      order_id: orderId,
      amount: 50.00,
      currency: "USD",
      status: "valid",
      qr_code: `TICKET-${orderId.slice(0, 8)}-002`.toUpperCase(),
    },
    {
      event_id: order.event_id,
      user_id: order.buyer_id,
      order_id: orderId,
      amount: 75.00,
      currency: "USD",
      status: "valid",
      qr_code: `TICKET-${orderId.slice(0, 8)}-VIP`.toUpperCase(),
    }
  ];

  // Insert tickets
  const { data: tickets, error: insertError } = await supabase
    .from("tickets")
    .insert(ticketsToCreate)
    .select();

  if (insertError) {
    return NextResponse.json({
      error: "Failed to create tickets",
      details: insertError.message
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Tickets created successfully",
    tickets: tickets,
    count: tickets?.length || 0,
    order: {
      id: order.id,
      event_title: order.events?.title
    }
  });
}

// GET method to check existing tickets
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId") || "7b5a816e-0ea8-4f5e-864a-68adcb2c7cfb";

  const supabase = await createClient();

  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("order_id", orderId);

  return NextResponse.json({
    orderId,
    ticketCount: tickets?.length || 0,
    tickets: tickets || [],
    error: error?.message
  });
}