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
    if (!body.tier_id || !body.quantity || body.quantity < 1) {
      return NextResponse.json(
        { error: "Tier ID and valid quantity are required" },
        { status: 400 }
      );
    }

    // Call the database function to calculate the price
    const { data, error } = await supabase.rpc("calculate_ticket_price", {
      p_tier_id: body.tier_id,
      p_quantity: body.quantity,
      p_discount_code: body.discount_code || null,
    });

    if (error) {
      console.error("Error calculating price:", error);

      // Handle specific errors
      if (error.message?.includes("Ticket tier not found")) {
        return NextResponse.json(
          { error: "Ticket tier not found" },
          { status: 404 }
        );
      }

      if (error.message?.includes("Quantity must be at least 1")) {
        return NextResponse.json(
          { error: "Invalid quantity" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to calculate price" },
        { status: 500 }
      );
    }

    // The function returns a single row with all price components
    const priceData = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      subtotal_cents: priceData.subtotal_cents,
      discount_cents: priceData.discount_cents,
      fees_cents: priceData.fees_cents,
      total_cents: priceData.total_cents,
      currency: priceData.currency,
    });
  } catch (error) {
    console.error("Error in POST /api/calculate-price:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}