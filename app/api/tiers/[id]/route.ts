import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const tierId = params.id;

    // Get the tier to check permissions
    const { data: tier, error: tierError } = await supabase
      .from("ticket_tiers")
      .select("event_id")
      .eq("id", tierId)
      .single();

    if (tierError || !tier) {
      return NextResponse.json(
        { error: "Ticket tier not found" },
        { status: 404 }
      );
    }

    // Get event and check permissions
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("community_id")
      .eq("id", tier.event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Check if user is admin/moderator of the community
    const { data: member, error: memberError } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", event.community_id)
      .eq("user_id", user.id)
      .single();

    if (
      memberError ||
      !member ||
      !["admin", "moderator"].includes(member.role)
    ) {
      return NextResponse.json(
        { error: "You don't have permission to manage this event" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Update the ticket tier
    const { data: updatedTier, error: updateError } = await supabase
      .from("ticket_tiers")
      .update({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.price_cents !== undefined && { price_cents: body.price_cents }),
        ...(body.quantity_available !== undefined && {
          quantity_available: body.quantity_available,
        }),
        ...(body.sales_start !== undefined && { sales_start: body.sales_start }),
        ...(body.sales_end !== undefined && { sales_end: body.sales_end }),
        ...(body.min_per_order !== undefined && {
          min_per_order: body.min_per_order,
        }),
        ...(body.max_per_order !== undefined && {
          max_per_order: body.max_per_order,
        }),
        ...(body.is_hidden !== undefined && { is_hidden: body.is_hidden }),
        ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
        ...(body.metadata !== undefined && { metadata: body.metadata }),
      })
      .eq("id", tierId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating ticket tier:", updateError);
      return NextResponse.json(
        { error: "Failed to update ticket tier" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tier: updatedTier,
    });
  } catch (error) {
    console.error("Error in PATCH /api/tiers/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const tierId = params.id;

    // Get the tier to check permissions
    const { data: tier, error: tierError } = await supabase
      .from("ticket_tiers")
      .select("event_id, quantity_sold")
      .eq("id", tierId)
      .single();

    if (tierError || !tier) {
      return NextResponse.json(
        { error: "Ticket tier not found" },
        { status: 404 }
      );
    }

    // Don't allow deletion if tickets have been sold
    if (tier.quantity_sold > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete tier with sold tickets",
        },
        { status: 400 }
      );
    }

    // Get event and check permissions
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("community_id")
      .eq("id", tier.event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Check if user is admin/moderator of the community
    const { data: member, error: memberError } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", event.community_id)
      .eq("user_id", user.id)
      .single();

    if (
      memberError ||
      !member ||
      !["admin", "moderator"].includes(member.role)
    ) {
      return NextResponse.json(
        { error: "You don't have permission to manage this event" },
        { status: 403 }
      );
    }

    // Delete the ticket tier
    const { error: deleteError } = await supabase
      .from("ticket_tiers")
      .delete()
      .eq("id", tierId);

    if (deleteError) {
      console.error("Error deleting ticket tier:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete ticket tier" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error in DELETE /api/tiers/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}