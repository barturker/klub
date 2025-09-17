import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { DateTime } from "luxon";

// Validation schema for updating an event
const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  event_type: z.enum(["physical", "virtual", "hybrid"]).optional(),
  start_at: z.string().datetime({ offset: true }).optional(),
  end_at: z.string().datetime({ offset: true }).optional(),
  timezone: z.string().optional(),
  venue_name: z.string().optional(),
  venue_address: z.string().optional(),
  venue_city: z.string().optional(),
  venue_country: z.string().optional(),
  online_url: z.string().url().optional(),
  capacity: z.number().min(0).optional(),
  image_url: z.string().url().optional(),
  status: z.enum(["draft", "published", "cancelled"]).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Get event by id or slug
export async function GET(request: Request, props: RouteParams) {
  const params = await props.params;

  try {
    console.log("[GET /api/events/[id]] Starting...");
    console.log("[GET] Event id/slug:", params.id);

    const supabase = await createClient();

    // Fetch event with community details
    const { data: event, error } = await supabase
      .from("events")
      .select(`
        *,
        community:communities (
          id,
          name,
          slug,
          description,
          image_url
        ),
        creator:profiles!events_created_by_fkey (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .or(`id.eq.${params.id},slug.eq.${params.id}`)
      .single();

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
        },
        { status: 500 }
      );
    }

    console.log("[GET] Event found:", event.id);

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
        recurring_instances: childEvents,
      },
    });
  } catch (error) {
    console.error("[GET /api/events/[id]] Error:", error);
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
    console.log("[PATCH /api/events/[id]] Starting...");
    console.log("[PATCH] Event id:", params.id);

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

    // Validate request data
    const validationResult = updateEventSchema.safeParse(body);

    if (!validationResult.success) {
      return Response.json(
        {
          error: "Invalid request data",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

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

    // Get the event first to check permissions
    const { data: event, error: fetchError } = await supabase
      .from("events")
      .select("id, community_id, created_by")
      .or(`id.eq.${params.id},slug.eq.${params.id}`)
      .single();

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

    return Response.json({
      success: true,
      event: updatedEvent,
    });
  } catch (error) {
    console.error("[PATCH /api/events/[id]] Error:", error);
    return Response.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// Delete event
export async function DELETE(request: Request, props: RouteParams) {
  const params = await props.params;

  try {
    console.log("[DELETE /api/events/[id]] Starting...");
    console.log("[DELETE] Event id:", params.id);

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

    // Get the event first to check permissions
    const { data: event, error: fetchError } = await supabase
      .from("events")
      .select("id, community_id")
      .or(`id.eq.${params.id},slug.eq.${params.id}`)
      .single();

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
    console.error("[DELETE /api/events/[id]] Error:", error);
    return Response.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}