import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Publish a draft event
export async function POST(request: Request, props: RouteParams) {
  const params = await props.params;

  try {
    console.log("[POST /api/events/[id]/publish] Starting...");
    console.log("[POST] Event ID:", params.id);

    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        {
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    // Get the event
    const { data: event, error: fetchError } = await supabase
      .from("events")
      .select("*, community:communities(slug)")
      .eq("id", params.id)
      .single();

    if (fetchError || !event) {
      console.log("[POST] Event not found:", fetchError);
      return Response.json(
        {
          error: "Event not found",
        },
        { status: 404 }
      );
    }

    // Check if user has permission
    const isCreator = event.created_by === user.id;

    if (!isCreator) {
      const { data: member } = await supabase
        .from("community_members")
        .select("role")
        .eq("community_id", event.community_id)
        .eq("user_id", user.id)
        .single();

      if (!member || !["admin", "moderator"].includes(member.role)) {
        return Response.json(
          {
            error: "You don't have permission to publish this event",
          },
          { status: 403 }
        );
      }
    }

    // Check if event is in draft status
    if (event.status !== "draft") {
      return Response.json(
        {
          error: `Cannot publish event with status: ${event.status}`,
        },
        { status: 400 }
      );
    }

    // Validate event has required fields for publishing
    if (event.event_type === "physical" || event.event_type === "hybrid") {
      if (!event.venue_name || !event.venue_city) {
        return Response.json(
          {
            error: "Physical events must have venue information",
          },
          { status: 400 }
        );
      }
    }

    if (event.event_type === "virtual" || event.event_type === "hybrid") {
      if (!event.online_url) {
        return Response.json(
          {
            error: "Virtual events must have an online URL",
          },
          { status: 400 }
        );
      }
    }

    // Update status to published
    const { data: publishedEvent, error: updateError } = await supabase
      .from("events")
      .update({ status: "published" })
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      console.log("[POST] Failed to publish event:", updateError);
      return Response.json(
        {
          error: "Failed to publish event",
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    // Also publish all child events if this is a recurring parent
    if (event.recurring_rule && !event.parent_event_id) {
      await supabase
        .from("events")
        .update({ status: "published" })
        .eq("parent_event_id", params.id)
        .eq("status", "draft");
    }

    console.log("[POST] Event published successfully");

    const eventUrl = `/communities/${event.community.slug}/events/${event.slug}`;

    return Response.json({
      success: true,
      event_url: eventUrl,
      message: "Event published successfully",
    });
  } catch (error) {
    console.error("[POST /api/events/[id]/publish] Error:", error);
    return Response.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}