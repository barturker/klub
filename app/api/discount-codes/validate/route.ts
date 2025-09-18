import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.event_id || !body.code) {
      return NextResponse.json(
        { error: "Event ID and code are required" },
        { status: 400 }
      );
    }

    // Call the database function to validate the discount code
    const { data, error } = await supabase.rpc("validate_discount_code", {
      p_event_id: body.event_id,
      p_code: body.code,
      p_tier_id: body.tier_id || null,
    });

    if (error) {
      console.error("Error validating discount code:", error);
      return NextResponse.json(
        { error: "Failed to validate discount code" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      valid: data.is_valid,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      message: data.message,
    });
  } catch (error) {
    console.error("Error in POST /api/discount-codes/validate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}