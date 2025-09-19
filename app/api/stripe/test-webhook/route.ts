import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // This is a test endpoint for simulating webhook events
    const body = await request.json();

    console.log("Test webhook received:", body.type);

    // For testing, just return success
    return NextResponse.json({
      received: true,
      type: body.type,
      message: "Test webhook processed successfully"
    });
  } catch (error) {
    console.error("Test webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process test webhook" },
      { status: 500 }
    );
  }
}