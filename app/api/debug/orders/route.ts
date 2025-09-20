import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    console.log("[DEBUG] ========== DIRECT DATABASE QUERY ==========");

    // Query orders directly to see what's actually in the database
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, status, stripe_session_id, metadata, buyer_email, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    console.log("[DEBUG] Direct query result:", {
      success: !error,
      count: orders?.length || 0,
      error: error?.message || null
    });

    if (error) {
      return NextResponse.json({
        error: "Query failed",
        details: error
      }, { status: 500 });
    }

    console.log("[DEBUG] Raw database orders:");
    orders?.forEach((order, index) => {
      console.log(`[DEBUG] Order ${index + 1}:`, {
        id: order.id,
        status: order.status,
        stripe_session_id: order.stripe_session_id,
        metadata_session_id: order.metadata?.stripe_session_id,
        buyer_email: order.buyer_email,
        created_at: order.created_at
      });
    });

    // Test specific session lookup
    const testSessionId = "cs_test_b1D9Xwj1wCB152HI0XfbMir2WmjioMoWtDhNxOMeDslK5Tur908usMGBdY";

    console.log("[DEBUG] ========== TESTING SESSION LOOKUP ==========");
    console.log("[DEBUG] Looking for session:", testSessionId);

    // Method 1: metadata lookup
    const { data: method1, error: error1 } = await supabase
      .from("orders")
      .select("*")
      .eq("metadata->>stripe_session_id", testSessionId);

    console.log("[DEBUG] Method 1 (metadata):", {
      found: method1?.length || 0,
      error: error1?.message || null,
      orders: method1?.map(o => ({ id: o.id, status: o.status }))
    });

    // Method 2: column lookup
    const { data: method2, error: error2 } = await supabase
      .from("orders")
      .select("*")
      .eq("stripe_session_id", testSessionId);

    console.log("[DEBUG] Method 2 (column):", {
      found: method2?.length || 0,
      error: error2?.message || null,
      orders: method2?.map(o => ({ id: o.id, status: o.status }))
    });

    // Method 3: combined lookup with status filter (what RPC function does)
    const { data: method3, error: error3 } = await supabase
      .from("orders")
      .select("*")
      .or(`stripe_session_id.eq.${testSessionId},metadata->>stripe_session_id.eq.${testSessionId}`)
      .in("status", ["pending", "processing"]);

    console.log("[DEBUG] Method 3 (RPC logic):", {
      found: method3?.length || 0,
      error: error3?.message || null,
      orders: method3?.map(o => ({ id: o.id, status: o.status }))
    });

    return NextResponse.json({
      success: true,
      orders,
      testSessionId,
      lookupResults: {
        method1: { count: method1?.length || 0, error: error1?.message },
        method2: { count: method2?.length || 0, error: error2?.message },
        method3: { count: method3?.length || 0, error: error3?.message }
      }
    });
  } catch (error) {
    console.error("[DEBUG] Error:", error);
    return NextResponse.json({
      error: "Debug failed",
      details: error
    }, { status: 500 });
  }
}