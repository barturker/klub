import { createClient } from "@/lib/supabase/server";
import { DateTime } from "luxon";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// List community events
export async function GET(request: Request, props: RouteParams) {
  const params = await props.params;

  try {
    console.log("🔍 [GET /api/communities/[id]/events] Starting...");
    console.log("📝 [GET] Community ID:", params.id);
    console.log("📝 [GET] Full URL:", request.url);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "published";
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const upcoming = searchParams.get("upcoming") === "true";
    const past = searchParams.get("past") === "true";

    console.log("📊 [GET] Query params:", {
      status,
      limit,
      offset,
      upcoming,
      past
    });

    const supabase = await createClient();

    // Check current user
    const { data: { user } } = await supabase.auth.getUser();
    console.log("👤 [GET] Current user:", user?.id, user?.email);

    // Build query - simplified without profile join for now
    let query = supabase
      .from("events")
      .select("*", { count: "exact" })
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

    console.log("🔍 [GET] Executing query...");
    const { data: events, error, count } = await query;

    if (error) {
      console.error("❌ [GET] Error fetching events:", error);
      console.error("❌ [GET] Error details:", {
        message: error.message,
        hint: error.hint,
        details: error.details,
        code: error.code
      });
      return Response.json(
        {
          error: "Failed to fetch community events",
          details: error.message,
        },
        { status: 500 }
      );
    }

    console.log(`✅ [GET] Query successful. Found ${events?.length || 0} events`);
    console.log("📋 [GET] Events data:", JSON.stringify(events, null, 2));

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
    console.log("📊 [GET] Fetching stats for community:", params.id);
    const { data: statsData, error: statsError } = await supabase
      .from("events")
      .select("status")
      .eq("community_id", params.id)
      .is("parent_event_id", null);

    if (statsError) {
      console.error("❌ [GET] Error fetching stats:", statsError);
    }

    console.log("📊 [GET] Stats data:", statsData);

    const stats = {
      total: statsData?.length || 0,
      published: statsData?.filter(e => e.status === "published").length || 0,
      draft: statsData?.filter(e => e.status === "draft").length || 0,
      cancelled: statsData?.filter(e => e.status === "cancelled").length || 0,
      completed: statsData?.filter(e => e.status === "completed").length || 0,
    };

    console.log("📊 [GET] Calculated stats:", stats);

    const response = {
      events: eventsWithNextOccurrence,
      total: count || 0,
      stats,
      limit,
      offset,
    };

    console.log("📤 [GET] Sending response:", {
      eventCount: response.events.length,
      total: response.total,
      stats: response.stats
    });

    return Response.json(response);
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