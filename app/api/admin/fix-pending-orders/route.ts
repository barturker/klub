import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    console.log("[ADMIN_FIX] ========== FIXING PENDING ORDERS ==========");

    // Get all pending orders
    const { data: pendingOrders, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    console.log("[ADMIN_FIX] Found pending orders:", {
      count: pendingOrders?.length || 0,
      error: fetchError?.message || null
    });

    if (fetchError) {
      return NextResponse.json({
        error: "Failed to fetch pending orders",
        details: fetchError
      }, { status: 500 });
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return NextResponse.json({
        message: "No pending orders found"
      });
    }

    // Log each pending order
    pendingOrders.forEach((order, index) => {
      console.log(`[ADMIN_FIX] Pending Order ${index + 1}:`, {
        id: order.id,
        amount: order.amount_cents,
        buyer_email: order.buyer_email,
        stripe_session_id: order.stripe_session_id,
        metadata_session_id: order.metadata?.stripe_session_id,
        created_at: order.created_at
      });
    });

    // For now, let's just return the info without updating
    // We can add manual update logic here if needed
    return NextResponse.json({
      success: true,
      message: "Found pending orders (no updates made yet)",
      pendingOrders: pendingOrders.map(order => ({
        id: order.id,
        amount_cents: order.amount_cents,
        buyer_email: order.buyer_email,
        stripe_session_id: order.stripe_session_id,
        metadata_session_id: order.metadata?.stripe_session_id,
        created_at: order.created_at
      }))
    });

  } catch (error) {
    console.error("[ADMIN_FIX] Error:", error);
    return NextResponse.json({
      error: "Admin fix failed",
      details: error
    }, { status: 500 });
  }
}