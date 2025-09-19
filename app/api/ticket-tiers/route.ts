import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { event_id, name, description, price_cents, max_quantity, max_per_order } = body;

    if (!event_id || !name || price_cents === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user has permission for this event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("community_id")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Check if user is admin of the community
    const { data: member, error: memberError } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", event.community_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member || member.role !== "admin") {
      return NextResponse.json(
        { error: "Not authorized to create ticket tiers for this event" },
        { status: 403 }
      );
    }

    // Create the ticket tier
    const { data: tier, error: tierError } = await supabase
      .from("ticket_tiers")
      .insert({
        event_id,
        name,
        description,
        price_cents,
        max_quantity: max_quantity || null,
        max_per_order: max_per_order || 10,
        sale_starts_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (tierError) {
      console.error("Error creating ticket tier:", tierError);
      return NextResponse.json(
        { error: "Failed to create ticket tier" },
        { status: 500 }
      );
    }

    return NextResponse.json(tier);
  } catch (error) {
    console.error("Error in ticket-tiers POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}