import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    const supabase = await createClient();

    console.log("[TEST] Testing update_order_from_webhook RPC with session:", sessionId);

    // Test the RPC function
    const { data: result, error } = await supabase
      .rpc('update_order_from_webhook', {
        p_session_id: sessionId,
        p_status: 'paid',
        p_payment_intent_id: 'test_pi_123',
        p_payment_method: 'card',
        p_paid_at: new Date().toISOString()
      });

    console.log("[TEST] RPC Result:", result);
    console.log("[TEST] RPC Error:", error);

    if (error) {
      return NextResponse.json({
        error: "RPC failed",
        details: error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error("[TEST] Error:", error);
    return NextResponse.json({
      error: "Test failed",
      details: error
    }, { status: 500 });
  }
}
