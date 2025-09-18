import { createClient } from "@/lib/supabase/server";
import { DateTime } from "luxon";

// Force Node.js runtime (ChatGPT solution for Zod + Turbopack issue)
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Get event by id or slug
export async function GET(request: Request, props: RouteParams) {
  const params = await props.params;

  try {
    console.log("[GET /api/events/[slug]] Starting...");
    console.log("[GET] Event slug:", params.slug);

    const supabase = await createClient();

    // Check if params.slug is a UUID or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.slug);
    console.log("[GET] Is UUID?", isUUID);
    console.log("[GET] Query type:", isUUID ? "by ID" : "by slug");

    // Build query based on whether it's UUID or slug
    let query = supabase
      .from("events")
      .select(`
        *,
        metadata
      `);

    if (isUUID) {
      console.log("[GET] Querying by ID:", params.slug);
      query = query.eq("id", params.slug);
    } else {
      console.log("[GET] Querying by slug:", params.slug);
      query = query.eq("slug", params.slug);
    }

    // Fetch event with community details
    const { data: event, error } = await query.single();

    if (error) {
      console.log("[GET] Error fetching event:", error);

      if (error.code === "PGRST116") {
        return Response.json(
          {
            error: "Event not found",
          },
          { status: 404 }
        );
      }

      return Response.json(
        {
          error: "Failed to fetch event",
          details: error.message,
        },
        { status: 500 }
      );
    }

    console.log("[GET] Event found:", event ? event.id : "No event found");
    console.log("[GET] Event status:", event?.status);
    console.log("[GET] Event metadata:", event?.metadata);
    console.log("[GET] Event metadata type:", typeof event?.metadata);
    console.log("[GET] Event metadata stringified:", JSON.stringify(event?.metadata));

    // Fetch creator info separately if needed
    let creator = null;
    if (event.created_by) {
      const { data: creatorData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", event.created_by)
        .single();

      creator = creatorData;
    }

    // Check if event is published or if user has access
    if (event.status !== "published") {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return Response.json(
          {
            error: "Event not found",
          },
          { status: 404 }
        );
      }

      // Check if user is creator or has admin/moderator access
      const { data: member } = await supabase
        .from("community_members")
        .select("role")
        .eq("community_id", event.community_id)
        .eq("user_id", user.id)
        .single();

      if (
        event.created_by !== user.id &&
        (!member || !["admin", "moderator"].includes(member.role))
      ) {
        return Response.json(
          {
            error: "Event not found",
          },
          { status: 404 }
        );
      }
    }

    // Fetch child events if this is a recurring parent
    let childEvents = [];
    if (event.recurring_rule && !event.parent_event_id) {
      const { data: children } = await supabase
        .from("events")
        .select("id, start_at, end_at, status")
        .eq("parent_event_id", event.id)
        .order("start_at", { ascending: true });

      childEvents = children || [];
    }

    return Response.json({
      event: {
        ...event,
        creator: creator,
        recurring_instances: childEvents,
      },
    });
  } catch (error) {
    console.error("[GET /api/events/[slug]] Error:", error);
    return Response.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// Update event
export async function PATCH(request: Request, props: RouteParams) {
  const params = await props.params;

  try {
    console.log("[PATCH /api/events/[slug]] Starting...");
    console.log("[PATCH] Event slug:", params.slug);

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

    // Parse request body
    const body = await request.json();
    console.log("[PATCH] Request body:", body);

    // Debug logging
    console.log("[PATCH] Raw body keys:", Object.keys(body));
    if (body.data) {
      console.log("[PATCH] body.data keys:", Object.keys(body.data));
    }

    // TURBOPACK BUG: Zod v4 + Turbopack incompatibility
    // See: https://github.com/colinhacks/zod/issues
    // Using manual validation as workaround until fixed
    console.log("[PATCH] Using manual validation due to Turbopack + Zod v4 bug");

    // Manual validation to replace Zod temporarily
    const validationResult = { success: true, data: body };

    // Basic field validations
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.length < 1 || body.title.length > 200) {
        return Response.json(
          { error: "Invalid title: must be between 1-200 characters" },
          { status: 400 }
        );
      }
    }

    if (body.event_type !== undefined) {
      if (!['physical', 'virtual', 'hybrid'].includes(body.event_type)) {
        return Response.json(
          { error: "Invalid event_type: must be 'physical', 'virtual', or 'hybrid'" },
          { status: 400 }
        );
      }
    }

    if (body.status !== undefined) {
      if (!['draft', 'published', 'cancelled'].includes(body.status)) {
        return Response.json(
          { error: "Invalid status: must be 'draft', 'published', or 'cancelled'" },
          { status: 400 }
        );
      }
    }

    if (body.capacity !== undefined) {
      if (typeof body.capacity !== 'number' || body.capacity < 0) {
        return Response.json(
          { error: "Invalid capacity: must be a non-negative number" },
          { status: 400 }
        );
      }
    }

    if (body.online_url !== undefined && body.online_url !== "" && body.online_url !== null) {
      try {
        new URL(body.online_url);
      } catch {
        return Response.json(
          { error: "Invalid online_url: must be a valid URL" },
          { status: 400 }
        );
      }
    }

    console.log("[PATCH] Manual validation passed");

    // Filter out fields that shouldn't be updated directly
    const {
      id,
      community_id,
      created_by,
      slug,
      created_at,
      updated_at,
      creator,
      recurring_instances,
      enable_ticketing,
      ticket_currency,
      is_recurring,
      is_free,
      registration_only,
      ...updateData
    } = validationResult.data;

    // Debug incoming data
    console.log("[PATCH] enable_ticketing from request:", enable_ticketing);
    console.log("[PATCH] ticket_currency from request:", ticket_currency);
    console.log("[PATCH] metadata from request:", updateData.metadata);

    // Validate dates if provided
    if (updateData.start_at && updateData.end_at) {
      const startDate = DateTime.fromISO(updateData.start_at);
      const endDate = DateTime.fromISO(updateData.end_at);

      if (!startDate.isValid || !endDate.isValid) {
        return Response.json(
          {
            error: "Invalid date format",
          },
          { status: 400 }
        );
      }

      if (endDate <= startDate) {
        return Response.json(
          {
            error: "End time must be after start time",
          },
          { status: 400 }
        );
      }
    }

    // Check if params.slug is a UUID or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.slug);

    // Build query to get the event
    let fetchQuery = supabase
      .from("events")
      .select("id, community_id, created_by, metadata");

    if (isUUID) {
      fetchQuery = fetchQuery.eq("id", params.slug);
    } else {
      fetchQuery = fetchQuery.eq("slug", params.slug);
    }

    // Get the event first to check permissions
    const { data: event, error: fetchError } = await fetchQuery.single();

    if (fetchError || !event) {
      return Response.json(
        {
          error: "Event not found",
        },
        { status: 404 }
      );
    }

    // Check if user has permission to update
    const isCreator = event.created_by === user.id;

    if (!isCreator) {
      const { data: member } = await supabase
        .from("community_members")
        .select("role")
        .eq("community_id", event.community_id)
        .eq("user_id", user.id)
        .single();

      if (!member || member.role !== "admin") {
        return Response.json(
          {
            error: "You don't have permission to update this event",
          },
          { status: 403 }
        );
      }
    }

    // Always preserve and merge metadata properly
    // The new UX sends metadata with is_free, registration_only flags
    updateData.metadata = {
      ...(event.metadata || {}), // Preserve existing metadata from DB
      ...(updateData.metadata || {}), // Apply new metadata from request
      ...(enable_ticketing !== undefined && { enable_ticketing }),
      ...(ticket_currency !== undefined && { ticket_currency })
    };

    // Log for debugging
    console.log("[PATCH] Existing metadata from DB:", event.metadata);
    console.log("[PATCH] Updated metadata after merge:", updateData.metadata);

    // Debug what we're sending to Supabase
    console.log("[PATCH] Final updateData being sent to Supabase:", JSON.stringify(updateData, null, 2));
    console.log("[PATCH] Updating event ID:", event.id);

    // Update the event
    const { data: updatedEvent, error: updateError } = await supabase
      .from("events")
      .update(updateData)
      .eq("id", event.id)
      .select()
      .single();

    if (updateError) {
      console.log("[PATCH] Update failed:", updateError);
      return Response.json(
        {
          error: "Failed to update event",
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    console.log("[PATCH] Event updated successfully");
    console.log("[PATCH] Updated event metadata:", updatedEvent?.metadata);
    console.log("[PATCH] Updated event full data:", JSON.stringify(updatedEvent, null, 2));

    return Response.json({
      success: true,
      event: updatedEvent,
    });
  } catch (error) {
    console.error("[PATCH /api/events/[slug]] Caught error:", error);
    console.error("[PATCH] Error stack:", error instanceof Error ? error.stack : "No stack");
    console.error("[PATCH] Error message:", error instanceof Error ? error.message : "Unknown error");

    return Response.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

// Delete event
export async function DELETE(request: Request, props: RouteParams) {
  const params = await props.params;

  try {
    console.log("[DELETE /api/events/[slug]] Starting...");
    console.log("[DELETE] Event slug:", params.slug);

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

    // Check if params.slug is a UUID or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.slug);

    // Build query to get the event
    let fetchQuery = supabase
      .from("events")
      .select("id, community_id");

    if (isUUID) {
      fetchQuery = fetchQuery.eq("id", params.slug);
    } else {
      fetchQuery = fetchQuery.eq("slug", params.slug);
    }

    // Get the event first to check permissions
    const { data: event, error: fetchError } = await fetchQuery.single();

    if (fetchError || !event) {
      return Response.json(
        {
          error: "Event not found",
        },
        { status: 404 }
      );
    }

    // Check if user has admin permission
    const { data: member, error: memberError } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", event.community_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member || member.role !== "admin") {
      return Response.json(
        {
          error: "Only community admins can delete events",
        },
        { status: 403 }
      );
    }

    // Delete the event (child events will be cascade deleted)
    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("id", event.id);

    if (deleteError) {
      console.log("[DELETE] Delete failed:", deleteError);
      return Response.json(
        {
          error: "Failed to delete event",
          details: deleteError.message,
        },
        { status: 500 }
      );
    }

    console.log("[DELETE] Event deleted successfully");

    return Response.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("[DELETE /api/events/[slug]] Error:", error);
    return Response.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}