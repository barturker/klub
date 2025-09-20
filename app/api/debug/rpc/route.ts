import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    const supabase = await createClient();

    console.log("[RPC_DEBUG] ========== DEBUGGING RPC FUNCTION ==========");
    console.log("[RPC_DEBUG] Testing session ID:", sessionId);

    // First, let's manually test the RPC function logic with raw SQL
    console.log("[RPC_DEBUG] Step 1: Testing manual search logic...");

    // Test the exact query the RPC function uses
    const { data: manualSearch, error: manualError } = await supabase
      .from("orders")
      .select("id, status, stripe_session_id, metadata, buyer_id, buyer_email, created_at")
      .or(`stripe_session_id.eq.${sessionId},metadata->>stripe_session_id.eq.${sessionId}`)
      .in("status", ["pending", "processing"]);

    console.log("[RPC_DEBUG] Manual search result:", {
      found: manualSearch?.length || 0,
      error: manualError?.message || null,
      orders: manualSearch?.map(o => ({
        id: o.id,
        status: o.status,
        stripe_session_id: o.stripe_session_id,
        metadata_session_id: o.metadata?.stripe_session_id
      }))
    });

    // Test with broader search (no status filter)
    const { data: broadSearch, error: broadError } = await supabase
      .from("orders")
      .select("id, status, stripe_session_id, metadata, buyer_id, buyer_email, created_at")
      .or(`stripe_session_id.eq.${sessionId},metadata->>stripe_session_id.eq.${sessionId}`);

    console.log("[RPC_DEBUG] Broad search (no status filter):", {
      found: broadSearch?.length || 0,
      error: broadError?.message || null,
      orders: broadSearch?.map(o => ({
        id: o.id,
        status: o.status,
        stripe_session_id: o.stripe_session_id,
        metadata_session_id: o.metadata?.stripe_session_id
      }))
    });

    // Test the new debug function first
    console.log("[RPC_DEBUG] Step 2: Testing debug function...");

    const { data: debugResult, error: debugError } = await supabase
      .rpc('debug_order_access', {
        p_session_id: sessionId
      });

    console.log("[RPC_DEBUG] Debug function result:", {
      success: !debugError,
      result: debugResult,
      error: debugError?.message || null
    });

    // Now test the actual RPC function
    console.log("[RPC_DEBUG] Step 3: Testing enhanced RPC function...");

    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('update_order_from_webhook', {
        p_session_id: sessionId,
        p_status: 'paid',
        p_payment_intent_id: 'test_pi_debug',
        p_payment_method: 'card',
        p_paid_at: new Date().toISOString()
      });

    console.log("[RPC_DEBUG] RPC function result:", {
      success: !rpcError,
      result: rpcResult,
      error: rpcError?.message || null
    });

    // If RPC succeeded but didn't update, let's check what orders exist
    if (!rpcError && rpcResult && rpcResult[0]?.updated === false) {
      console.log("[RPC_DEBUG] Step 3: RPC didn't update - checking all orders...");

      const { data: allOrders, error: allError } = await supabase
        .from("orders")
        .select("id, status, stripe_session_id, metadata, buyer_id, buyer_email, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      console.log("[RPC_DEBUG] Recent orders:", {
        found: allOrders?.length || 0,
        error: allError?.message || null,
        orders: allOrders?.map(o => ({
          id: o.id,
          status: o.status,
          stripe_session_id: o.stripe_session_id,
          metadata_session_id: o.metadata?.stripe_session_id,
          buyer_email: o.buyer_email
        }))
      });
    }

    return NextResponse.json({
      success: true,
      sessionId,
      manualSearch: {
        count: manualSearch?.length || 0,
        orders: manualSearch || [],
        error: manualError?.message
      },
      broadSearch: {
        count: broadSearch?.length || 0,
        orders: broadSearch || [],
        error: broadError?.message
      },
      debugFunction: {
        success: !debugError,
        result: debugResult,
        error: debugError?.message
      },
      rpcResult: {
        success: !rpcError,
        result: rpcResult,
        error: rpcError?.message
      }
    });
  } catch (error) {
    console.error("[RPC_DEBUG] Error:", error);
    return NextResponse.json({
      error: "Debug failed",
      details: error
    }, { status: 500 });
  }
}