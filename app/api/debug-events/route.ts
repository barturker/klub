import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Direct query without any filters
    const { data: events, error, count } = await supabase
      .from("events")
      .select("*", { count: "exact" });

    console.log("[DEBUG] Events count:", count);
    console.log("[DEBUG] Events error:", error);
    console.log("[DEBUG] Events data:", events);

    return Response.json({
      count,
      events: events || [],
      error: error?.message || null,
    });
  } catch (error) {
    console.error("[DEBUG] Error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}