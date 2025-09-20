import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("id");

  if (!orderId) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Get the order with all details
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error) {
    return NextResponse.json({
      error: "Order not found",
      details: error.message,
      orderId
    }, { status: 404 });
  }

  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();

  return NextResponse.json({
    success: true,
    order: order,
    user: user ? {
      id: user.id,
      email: user.email
    } : null,
    hasAccess: user ? (order.buyer_id === user.id) : false
  });
}