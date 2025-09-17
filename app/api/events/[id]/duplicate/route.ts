import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { DateTime } from "luxon";

const duplicateEventSchema = z.object({
  new_date: z.string().datetime({ offset: true }).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Duplicate an event as draft
export async function POST(request: Request, props: RouteParams) {
  const params = await props.params;

  try {
    console.log("[POST /api/events/[id]/duplicate] Starting...");
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

    // Parse request body
    const body = await request.json();
    const validationResult = duplicateEventSchema.safeParse(body);

    if (!validationResult.success) {
      return Response.json(
        {
          error: "Invalid request data",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { new_date } = validationResult.data;

    // Get the original event
    const { data: originalEvent, error: fetchError } = await supabase
      .from("events")
      .select("*")
      .eq("id", params.id)
      .single();

    if (fetchError || !originalEvent) {
      console.log("[POST] Event not found:", fetchError);
      return Response.json(
        {
          error: "Event not found",
        },
        { status: 404 }
      );
    }

    // Check if user has permission
    const { data: member } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", originalEvent.community_id)
      .eq("user_id", user.id)
      .single();

    if (!member || !["admin", "moderator"].includes(member.role)) {
      return Response.json(
        {
          error: "You don't have permission to duplicate this event",
        },
        { status: 403 }
      );
    }

    // Calculate new dates if provided
    let newStartAt = originalEvent.start_at;
    let newEndAt = originalEvent.end_at;

    if (new_date) {
      const originalStart = DateTime.fromISO(originalEvent.start_at);
      const originalEnd = DateTime.fromISO(originalEvent.end_at);
      const newStart = DateTime.fromISO(new_date);

      if (!newStart.isValid) {
        return Response.json(
          {
            error: "Invalid date format",
          },
          { status: 400 }
        );
      }

      const duration = originalEnd.diff(originalStart);
      const newEnd = newStart.plus(duration);

      newStartAt = newStart.toISO();
      newEndAt = newEnd.toISO();
    }

    // Generate a new slug
    const { data: newSlug, error: slugError } = await supabase.rpc(
      "generate_event_slug",
      {
        p_title: `${originalEvent.title} (Copy)`,
        p_community_id: originalEvent.community_id,
      }
    );

    if (slugError) {
      console.log("[POST] Slug generation failed:", slugError);
      return Response.json(
        {
          error: "Failed to generate event slug",
        },
        { status: 500 }
      );
    }

    // Create the duplicate event
    const duplicateData = {
      ...originalEvent,
      id: undefined, // Let database generate new ID
      title: `${originalEvent.title} (Copy)`,
      slug: newSlug,
      status: "draft",
      created_by: user.id,
      start_at: newStartAt,
      end_at: newEndAt,
      parent_event_id: null, // Don't duplicate parent relationship
      recurring_rule: null, // Don't duplicate recurring rules
      recurring_end_date: null,
      created_at: undefined, // Let database set timestamps
      updated_at: undefined,
    };

    delete duplicateData.id;
    delete duplicateData.created_at;
    delete duplicateData.updated_at;

    const { data: newEvent, error: createError } = await supabase
      .from("events")
      .insert(duplicateData)
      .select()
      .single();

    if (createError) {
      console.log("[POST] Failed to duplicate event:", createError);
      return Response.json(
        {
          error: "Failed to duplicate event",
          details: createError.message,
        },
        { status: 500 }
      );
    }

    console.log("[POST] Event duplicated successfully:", newEvent.id);

    return Response.json({
      event_id: newEvent.id,
      slug: newEvent.slug,
      message: "Event duplicated successfully",
    });
  } catch (error) {
    console.error("[POST /api/events/[id]/duplicate] Error:", error);
    return Response.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}