import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    console.log("[DIRECT_DEBUG] ========== DIRECT ORDER STATUS CHECK ==========");

    // Test the exact same query that the orders page uses
    console.log("[DIRECT_DEBUG] Testing orders page query...");

    const { data: pageQuery, error: pageError } = await supabase
      .from("orders")
      .select(`
        *,
        events!inner (
          id,
          title,
          start_at,
          community_id
        )
      `)
      .eq("events.community_id", "425ed2b0-f1fb-49a0-97b0-08da0d3901b0")
      .order("created_at", { ascending: false });

    console.log("[DIRECT_DEBUG] Orders page query result:", {
      success: !pageError,
      count: pageQuery?.length || 0,
      error: pageError?.message || null
    });

    if (pageQuery) {
      console.log("[DIRECT_DEBUG] Orders from page query:");
      pageQuery.forEach((order, index) => {
        console.log(`[DIRECT_DEBUG] Order ${index + 1}:`, {
          id: order.id,
          status: order.status,
          session_id_column: order.stripe_session_id,
          session_id_metadata: order.metadata?.stripe_session_id,
          updated_at: order.updated_at,
          paid_at: order.paid_at
        });
      });
    }

    // Test with SECURITY DEFINER approach - call our debug function
    console.log("[DIRECT_DEBUG] Testing SECURITY DEFINER function...");

    const testSessionId = "cs_test_b1D9Xwj1wCB152HI0XfbMir2WmjioMoWtDhNxOMeDslK5Tur908usMGBdY";
    const { data: securityDefinerQuery, error: sdError } = await supabase
      .rpc('debug_order_access', {
        p_session_id: testSessionId
      });

    console.log("[DIRECT_DEBUG] SECURITY DEFINER result:", {
      success: !sdError,
      count: securityDefinerQuery?.length || 0,
      error: sdError?.message || null,
      orders: securityDefinerQuery
    });

    // Compare the same order between both approaches
    const targetOrderId = "dd3954c1-2ca9-46ce-91d1-1ed66e404bf5";
    const pageOrder = pageQuery?.find(o => o.id === targetOrderId);
    const sdOrder = securityDefinerQuery?.find(o => o.order_id === targetOrderId);

    console.log("[DIRECT_DEBUG] ========== COMPARISON ==========");
    console.log("[DIRECT_DEBUG] Target order:", targetOrderId);
    console.log("[DIRECT_DEBUG] Page query order:", pageOrder ? {
      id: pageOrder.id,
      status: pageOrder.status,
      updated_at: pageOrder.updated_at,
      paid_at: pageOrder.paid_at
    } : "NOT FOUND");
    console.log("[DIRECT_DEBUG] SECURITY DEFINER order:", sdOrder ? {
      id: sdOrder.order_id,
      status: sdOrder.order_status,
      session_metadata: sdOrder.session_in_metadata,
      session_column: sdOrder.session_in_column
    } : "NOT FOUND");

    return NextResponse.json({
      success: true,
      comparison: {
        targetOrderId,
        pageQuery: {
          found: !!pageOrder,
          status: pageOrder?.status,
          updated_at: pageOrder?.updated_at,
          paid_at: pageOrder?.paid_at
        },
        securityDefiner: {
          found: !!sdOrder,
          status: sdOrder?.order_status,
          session_metadata: sdOrder?.session_in_metadata,
          session_column: sdOrder?.session_in_column
        }
      },
      pageQueryOrders: pageQuery?.map(o => ({
        id: o.id,
        status: o.status,
        updated_at: o.updated_at,
        paid_at: o.paid_at
      })) || [],
      securityDefinerOrders: securityDefinerQuery || []
    });

  } catch (error) {
    console.error("[DIRECT_DEBUG] Error:", error);
    return NextResponse.json({
      error: "Direct query debug failed",
      details: error
    }, { status: 500 });
  }
}