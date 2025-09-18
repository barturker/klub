import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { DateTime } from "luxon";
import { RRule } from "rrule";

// Validation schema for creating an event
const createEventSchema = z.object({
  community_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(["draft", "published", "cancelled"]).optional().default("published"),
  event_type: z.enum(["physical", "virtual", "hybrid"]).default("physical"),
  start_at: z.string().datetime({ offset: true }),
  end_at: z.string().datetime({ offset: true }),
  timezone: z.string().default("UTC"),
  venue_name: z.string().optional().transform(val => val === "" ? undefined : val),
  venue_address: z.string().optional().transform(val => val === "" ? undefined : val),
  venue_city: z.string().optional().transform(val => val === "" ? undefined : val),
  venue_country: z.string().optional().transform(val => val === "" ? undefined : val),
  online_url: z.union([z.string().url(), z.literal("")]).optional().transform(val => val === "" ? undefined : val),
  capacity: z.number().min(0).default(0),
  image_url: z.union([z.string().url(), z.literal("")]).optional().transform(val => val === "" ? undefined : val),
  recurring_rule: z.string().optional().transform(val => val === "" ? undefined : val),
  recurring_end_date: z.union([
    z.string().datetime({ offset: true }),
    z.literal(""),
    z.null()
  ]).optional().transform(val => val === "" ? null : val),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: Request) {
  console.log("[POST /api/events] Starting...");

  try {
    const supabase = await createClient();
    console.log("[POST] Supabase client created");

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("[POST] Auth check failed:", authError);
      return Response.json(
        {
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    console.log("[POST] User authenticated:", user.id);

    // Parse request body
    const body = await request.json();
    console.log("[POST] Request body received:");
    console.log("  - title:", body.title);
    console.log("  - community_id:", body.community_id);
    console.log("  - event_type:", body.event_type);
    console.log("  - start_at:", body.start_at);
    console.log("  - end_at:", body.end_at);
    console.log("  - timezone:", body.timezone);
    console.log("  - venue_name:", body.venue_name);
    console.log("  - online_url:", body.online_url);
    console.log("  - capacity:", body.capacity);
    console.log("  - tags:", body.tags);
    console.log("  - Full body:", JSON.stringify(body, null, 2));

    // Validate request data
    const validationResult = createEventSchema.safeParse(body);

    if (!validationResult.success) {
      console.log("[POST] ❌ Validation FAILED");
      console.log("[POST] Validation errors:");
      validationResult.error.issues.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. Field: ${issue.path.join('.')}`);
        console.log(`     Message: ${issue.message}`);
        console.log(`     Code: ${issue.code}`);
      });

      const flattenedErrors = validationResult.error.flatten();
      console.log("[POST] Flattened errors:", JSON.stringify(flattenedErrors, null, 2));

      return Response.json(
        {
          error: "Invalid request data",
          details: flattenedErrors?.fieldErrors || {},
          issues: validationResult.error.issues || [],
        },
        { status: 400 }
      );
    }

    console.log("[POST] ✅ Validation PASSED");

    const data = validationResult.data;

    // Validate dates
    const startDate = DateTime.fromISO(data.start_at);
    const endDate = DateTime.fromISO(data.end_at);

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
    if (data.recurring_rule) {
      try {
        const rule = RRule.fromString(data.recurring_rule);
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
    console.log("[POST] Checking user permissions in community:", data.community_id);
    const { data: memberData, error: memberError } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", data.community_id)
      .eq("user_id", user.id)
      .single();

    console.log("[POST] Member check result:", { memberData, memberError });

    if (memberError || !memberData) {
      console.log("[POST] ❌ Member check failed:", memberError);
      return Response.json(
        {
          error: "You are not a member of this community",
        },
        { status: 403 }
      );
    }

    if (!["admin", "moderator"].includes(memberData.role)) {
      console.log("[POST] ❌ Permission denied. User role:", memberData.role);
      return Response.json(
        {
          error: "Only admins and moderators can create events",
        },
        { status: 403 }
      );
    }

    console.log("[POST] ✅ User has permission. Role:", memberData.role);

    // Generate slug locally (since database function might not exist)
    console.log("[POST] Generating slug for title:", data.title);

    // Create base slug from title
    let baseSlug = data.title
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
        .eq("community_id", data.community_id);

      if (checkError) {
        console.log("[POST] ❌ Error checking slug uniqueness:", checkError);
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

    console.log("[POST] ✅ Generated slug:", slugData);

    // Create the event
    const eventData = {
      community_id: data.community_id,
      created_by: user.id,
      title: data.title,
      slug: slugData,
      description: data.description,
      event_type: data.event_type,
      status: data.status || "published",
      start_at: data.start_at,
      end_at: data.end_at,
      timezone: data.timezone,
      venue_name: data.venue_name,
      venue_address: data.venue_address,
      venue_city: data.venue_city,
      venue_country: data.venue_country,
      online_url: data.online_url,
      capacity: data.capacity,
      image_url: data.image_url,
      recurring_rule: data.recurring_rule,
      recurring_end_date: data.recurring_end_date,
      tags: data.tags || [],
      metadata: data.metadata || {},
    };

    console.log("[POST] Creating event with data:", eventData);

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert(eventData)
      .select()
      .single();

    if (eventError) {
      console.log("[POST] ❌ Event creation FAILED:");
      console.log("  - Error code:", eventError.code);
      console.log("  - Error message:", eventError.message);
      console.log("  - Error details:", eventError.details);
      console.log("  - Full error:", eventError);
      return Response.json(
        {
          error: "Failed to create event",
          details: eventError.message,
          code: eventError.code,
        },
        { status: 500 }
      );
    }

    console.log("[POST] ✅ Event created successfully!");
    console.log("  - Event ID:", event.id);
    console.log("  - Event slug:", event.slug);
    console.log("  - Event status:", event.status);

    // Generate recurring event instances if this is a recurring event
    if (data.recurring_rule && data.recurring_rule !== "" && data.recurring_end_date && data.recurring_end_date !== null) {
      try {
        const rule = RRule.fromString(data.recurring_rule);
        const recurringEndDate = DateTime.fromISO(data.recurring_end_date);

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