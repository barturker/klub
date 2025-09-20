import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  // Get all orders
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, status, amount_cents, buyer_email, created_at, event_id")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({
      error: "Failed to fetch orders",
      details: error.message
    }, { status: 500 });
  }

  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();

  return NextResponse.json({
    success: true,
    total: orders?.length || 0,
    orders: orders || [],
    user: user ? {
      id: user.id,
      email: user.email
    } : null
  });
}