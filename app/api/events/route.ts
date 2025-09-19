import { createClient } from "@/lib/supabase/server";
import { DateTime } from "luxon";
import { RRule } from "rrule";

// Manual validation for Turbopack compatibility
interface CreateEventData {
  community_id: string;
  title: string;
  description?: string;
  status?: "draft" | "published" | "cancelled";
  event_type?: "physical" | "virtual" | "hybrid";
  start_at: string;
  end_at: string;
  timezone?: string;
  venue_name?: string;
  venue_address?: string;
  venue_city?: string;
  venue_country?: string;
  online_url?: string;
  capacity?: number;
  image_url?: string;
  recurring_rule?: string;
  recurring_end_date?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

function validateCreateEventData(data: unknown): { success: boolean; data?: CreateEventData; errors?: Record<string, string[]> } {
  const errors: Record<string, string[]> = {};

  // Type guard
  if (!data || typeof data !== 'object') {
    errors.general = ['Invalid data format'];
    return { success: false, errors };
  }

  const eventData = data as Record<string, unknown>;

  // Required fields
  if (!eventData.community_id || typeof eventData.community_id !== 'string') {
    errors.community_id = ['Community ID is required'];
  }
  if (!eventData.title || typeof eventData.title !== 'string' || (eventData.title as string).length < 1 || (eventData.title as string).length > 200) {
    errors.title = ['Title is required and must be between 1 and 200 characters'];
  }
  if (!eventData.start_at || typeof eventData.start_at !== 'string') {
    errors.start_at = ['Start time is required'];
  }
  if (!eventData.end_at || typeof eventData.end_at !== 'string') {
    errors.end_at = ['End time is required'];
  }

  // Optional enums with validation
  if (eventData.status && !["draft", "published", "cancelled"].includes(eventData.status as string)) {
    errors.status = ['Status must be draft, published, or cancelled'];
  }
  if (eventData.event_type && !["physical", "virtual", "hybrid"].includes(eventData.event_type)) {
    errors.event_type = ['Event type must be physical, virtual, or hybrid'];
  }

  // Optional number validation
  if (eventData.capacity !== undefined && (typeof eventData.capacity !== 'number' || eventData.capacity < 0)) {
    errors.capacity = ['Capacity must be a positive number'];
  }

  // Clean up empty strings
  const cleanedData: CreateEventData = {
    community_id: eventData.community_id,
    title: eventData.title,
    description: eventData.description || undefined,
    status: eventData.status || "published",
    event_type: eventData.event_type || "physical",
    start_at: eventData.start_at,
    end_at: eventData.end_at,
    timezone: eventData.timezone || "UTC",
    venue_name: eventData.venue_name || undefined,
    venue_address: eventData.venue_address || undefined,
    venue_city: eventData.venue_city || undefined,
    venue_country: eventData.venue_country || undefined,
    online_url: eventData.online_url || undefined,
    capacity: eventData.capacity || 0,
    image_url: eventData.image_url || undefined,
    recurring_rule: eventData.recurring_rule || undefined,
    recurring_end_date: eventData.recurring_end_date || null,
    tags: eventData.tags || [],
    metadata: eventData.metadata || {},
  };

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: cleanedData };
}

export async function POST(request: Request) {
  try {
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

    // Validate request data using manual validation
    const validationResult = validateCreateEventData(body);

    if (!validationResult.success) {
      return Response.json(
        {
          error: "Invalid request data",
          details: validationResult.errors || {},
        },
        { status: 400 }
      );
    }

    const data = validationResult.data!;

    // Validate dates
    const startDate = DateTime.fromISO(eventData.start_at);
    const endDate = DateTime.fromISO(eventData.end_at);

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

    // Validate recurring rule if provided
    if (eventData.recurring_rule) {
      try {
        const rule = RRule.fromString(eventData.recurring_rule);
        console.log("[POST] Valid RRULE:", rule.toString());
      } catch (error) {
        console.log("[POST] Invalid RRULE:", error);
        return Response.json(
          {
            error: "Invalid recurring rule format",
          },
          { status: 400 }
        );
      }
    }

    // Check if user has permission to create events in this community
    const { data: memberData, error: memberError } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", eventData.community_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      return Response.json(
        {
          error: "You are not a member of this community",
        },
        { status: 403 }
      );
    }

    if (!["admin", "moderator"].includes(memberData.role)) {
      return Response.json(
        {
          error: "Only admins and moderators can create events",
        },
        { status: 403 }
      );
    }

    // Generate slug locally (since database function might not exist)

    // Create base slug from title
    let baseSlug = eventData.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove non-alphanumeric
      .replace(/\s+/g, '-')      // Replace spaces with hyphens
      .replace(/-+/g, '-')       // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens

    if (!baseSlug) baseSlug = 'event';

    // Check for uniqueness and add counter if needed
    let slugData = baseSlug;
    let counter = 0;
    let isUnique = false;

    while (!isUnique) {
      const { count, error: checkError } = await supabase
        .from("events")
        .select("id", { count: 'exact', head: true })
        .eq("slug", slugData)
        .eq("community_id", eventData.community_id);

      if (checkError) {
        // Continue anyway with the current slug
        break;
      }

      if (count === 0) {
        isUnique = true;
      } else {
        counter++;
        slugData = `${baseSlug}-${counter}`;
      }
    }

    // Create the event
    const eventData = {
      community_id: eventData.community_id,
      created_by: user.id,
      title: eventData.title,
      slug: slugData,
      description: eventData.description,
      event_type: eventData.event_type,
      status: eventData.status || "published",
      start_at: eventData.start_at,
      end_at: eventData.end_at,
      timezone: eventData.timezone,
      venue_name: eventData.venue_name,
      venue_address: eventData.venue_address,
      venue_city: eventData.venue_city,
      venue_country: eventData.venue_country,
      online_url: eventData.online_url,
      capacity: eventData.capacity,
      image_url: eventData.image_url,
      recurring_rule: eventData.recurring_rule,
      recurring_end_date: eventData.recurring_end_date,
      tags: eventData.tags || [],
      metadata: eventData.metadata || {},
    };

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert(eventData)
      .select()
      .single();

    if (eventError) {
      return Response.json(
        {
          error: "Failed to create event",
          details: eventError.message,
          code: eventError.code,
        },
        { status: 500 }
      );
    }

    // Generate recurring event instances if this is a recurring event
    if (eventData.recurring_rule && eventData.recurring_rule !== "" && eventData.recurring_end_date && eventData.recurring_end_date !== null) {
      try {
        const rule = RRule.fromString(eventData.recurring_rule);
        const recurringEndDate = DateTime.fromISO(eventData.recurring_end_date);

        // Get occurrences
        const occurrences = rule.between(
          startDate.toJSDate(),
          recurringEndDate.toJSDate(),
          true
        );

        console.log(`[POST] Generating ${occurrences.length} recurring instances`);

        // Create instances (skip the first one as it's the parent event)
        if (occurrences.length > 1) {
          const instances = occurrences.slice(1, 50).map((date) => {
            const instanceStart = DateTime.fromJSDate(date);
            const duration = endDate.diff(startDate);
            const instanceEnd = instanceStart.plus(duration);

            return {
              ...eventData,
              parent_event_id: event.id,
              start_at: instanceStart.toISO(),
              end_at: instanceEnd.toISO(),
              slug: `${slugData}-${instanceStart.toFormat("yyyy-MM-dd")}`,
            };
          });

          const { error: instanceError } = await supabase
            .from("events")
            .insert(instances);

          if (instanceError) {
            console.log("[POST] Failed to create recurring instances:", instanceError);
            // Don't fail the whole request, just log the error
          }
        }
      } catch (error) {
        console.log("[POST] Error generating recurring instances:", error);
        // Don't fail the whole request
      }
    }

    return Response.json({
      event_id: event.id,
      slug: event.slug,
      status: event.status,
      message: "Event created successfully",
    });
  } catch (error) {
    console.error("[POST /api/events] Error:", error);
    return Response.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// List events
export async function GET(request: Request) {
  try {
    console.log("[GET /api/events] Starting...");

    const { searchParams } = new URL(request.url);
    const community_id = searchParams.get("community_id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from("events")
      .select("*, community:communities(name, slug)");

    // Apply filters
    if (community_id) {
      query = query.eq("community_id", community_id);
    }

    if (status) {
      query = query.eq("status", status);
    }

    // Apply pagination and ordering
    query = query
      .order("start_at", { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: events, error, count } = await query;

    if (error) {
      console.log("[GET] Error fetching events:", error);
      return Response.json(
        {
          error: "Failed to fetch events",
        },
        { status: 500 }
      );
    }

    console.log(`[GET] Found ${events?.length || 0} events`);

    return Response.json({
      events: events || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[GET /api/events] Error:", error);
    return Response.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}