import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createClient();

    const { data: tiers, error } = await supabase
      .from("ticket_tiers")
      .select("*")
      .eq("event_id", params.eventId)
      .order("price_cents", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch ticket tiers" },
        { status: 500 }
      );
    }

    return NextResponse.json({ tiers: tiers || [] });
  } catch (error) {
    console.error("Error fetching ticket tiers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}