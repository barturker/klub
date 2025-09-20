import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Use service role for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  console.log("[TEST API] ===== UPDATE ORDER TEST =====");

  try {
    const { orderId, status } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    // Use service role client for admin access
    const supabase = createServerClient(supabaseUrl, serviceRoleKey);

    // Get current order
    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    console.log("[TEST API] Current order:", {
      id: currentOrder?.id,
      status: currentOrder?.status,
      amount: currentOrder?.amount_cents,
      metadata: currentOrder?.metadata
    });

    if (fetchError || !currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order status
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: status || "paid",
        paid_at: new Date().toISOString(),
        metadata: {
          ...currentOrder.metadata,
          test_update: true,
          updated_at: new Date().toISOString()
        }
      })
      .eq("id", orderId)
      .select()
      .single();

    console.log("[TEST API] Update result:", {
      success: !updateError,
      newStatus: updatedOrder?.status,
      error: updateError?.message
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Order updated",
      order: updatedOrder
    });

  } catch (error) {
    console.error("[TEST API] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log("[TEST API] ===== GET ORDERS STATUS =====");

  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, status, amount_cents, buyer_email, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  console.log("[TEST API] Orders found:", orders?.length || 0);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    orders,
    summary: {
      total: orders?.length || 0,
      pending: orders?.filter(o => o.status === "pending").length || 0,
      paid: orders?.filter(o => o.status === "paid").length || 0,
      failed: orders?.filter(o => o.status === "failed").length || 0
    }
  });
}