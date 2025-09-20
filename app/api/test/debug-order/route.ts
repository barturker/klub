import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("id") || "7b5a816e-0ea8-4f5e-864a-68adcb2c7cfb";

  const supabase = await createClient();

  // First, check if order exists at all
  const { data: orderExists, error: checkError } = await supabase
    .from("orders")
    .select("id, status, created_at")
    .eq("id", orderId)
    .single();

  if (checkError || !orderExists) {
    // Try to list all orders
    const { data: allOrders } = await supabase
      .from("orders")
      .select("id, status, created_at")
      .limit(5);

    return NextResponse.json({
      error: "Order not found",
      orderId,
      checkError: checkError?.message,
      availableOrders: allOrders || [],
      suggestion: "No orders found in database. Orders may need to be created first."
    });
  }

  // Get the full order with relations
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(`
      *,
      events!inner (
        id,
        title,
        start_at,
        community_id,
        communities!inner (
          id,
          name,
          slug
        )
      )
    `)
    .eq("id", orderId)
    .single();

  if (orderError) {
    return NextResponse.json({
      error: "Error fetching order with relations",
      orderId,
      orderExists: true,
      errorMessage: orderError.message,
      errorDetails: orderError
    });
  }

  // Check tickets
  const { data: tickets } = await supabase
    .from("tickets")
    .select("*")
    .eq("order_id", orderId);

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Check access
  let hasAccess = false;
  if (user) {
    if (order.buyer_id === user.id) {
      hasAccess = true;
    } else {
      const { data: member } = await supabase
        .from("community_members")
        .select("role")
        .eq("community_id", order.events.community_id)
        .eq("user_id", user.id)
        .single();

      hasAccess = member?.role === "admin" || member?.role === "moderator";
    }
  }

  return NextResponse.json({
    success: true,
    order: {
      id: order.id,
      status: order.status,
      amount_cents: order.amount_cents,
      buyer_id: order.buyer_id,
      created_at: order.created_at,
      event: order.events,
      ticketCount: tickets?.length || 0
    },
    currentUser: user ? {
      id: user.id,
      email: user.email
    } : null,
    hasAccess,
    debugInfo: {
      orderId,
      orderFound: true,
      ticketsFound: tickets?.length || 0,
      userAuthenticated: !!user,
      accessGranted: hasAccess
    }
  });
}