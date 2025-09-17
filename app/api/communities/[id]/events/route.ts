import { createClient } from "@/lib/supabase/server";
import { DateTime } from "luxon";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// List community events
export async function GET(request: Request, props: RouteParams) {
  const params = await props.params;

  try {
    console.log("[GET /api/communities/[id]/events] Starting...");
    console.log("[GET] Community ID:", params.id);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "published";
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const upcoming = searchParams.get("upcoming") === "true";
    const past = searchParams.get("past") === "true";

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from("events")
      .select(`
        *,
        creator:profiles!events_created_by_fkey (
          id,
          username,
          full_name,
          avatar_url
        )
      `, { count: "exact" })
      .eq("community_id", params.id);

    // Apply status filter
    if (status) {
      query = query.eq("status", status);
    }

    // Apply time filters
    const now = DateTime.now().toISO();

    if (upcoming) {
      query = query.gte("start_at", now);
    } else if (past) {
      query = query.lt("start_at", now);
    }

    // Don't show child events of recurring series in the main list
    query = query.is("parent_event_id", null);

    // Apply ordering and pagination
    query = query
      .order("start_at", { ascending: upcoming || !past })
      .range(offset, offset + limit - 1);

    const { data: events, error, count } = await query;

    if (error) {
      console.log("[GET] Error fetching events:", error);
      return Response.json(
        {
          error: "Failed to fetch community events",
          details: error.message,
        },
        { status: 500 }
      );
    }

    console.log(`[GET] Found ${events?.length || 0} events for community`);

    // For recurring events, fetch the next occurrence
    const eventsWithNextOccurrence = await Promise.all(
      (events || []).map(async (event) => {
        if (event.recurring_rule) {
          // Fetch the next upcoming instance
          const { data: nextInstance } = await supabase
            .from("events")
            .select("start_at, end_at")
            .eq("parent_event_id", event.id)
            .eq("status", event.status)
            .gte("start_at", now)
            .order("start_at", { ascending: true })
            .limit(1)
            .single();

          if (nextInstance) {
            event.next_occurrence = nextInstance;
          }
        }
        return event;
      })
    );

    // Get event statistics for the community
    const { data: statsData } = await supabase
      .from("events")
      .select("status")
      .eq("community_id", params.id)
      .is("parent_event_id", null);

    const stats = {
      total: statsData?.length || 0,
      published: statsData?.filter(e => e.status === "published").length || 0,
      draft: statsData?.filter(e => e.status === "draft").length || 0,
      cancelled: statsData?.filter(e => e.status === "cancelled").length || 0,
      completed: statsData?.filter(e => e.status === "completed").length || 0,
    };

    return Response.json({
      events: eventsWithNextOccurrence,
      total: count || 0,
      stats,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[GET /api/communities/[id]/events] Error:", error);
    return Response.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}