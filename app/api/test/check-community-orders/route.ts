import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  // Get zimbads community
  const { data: community } = await supabase
    .from("communities")
    .select("id, name, slug")
    .eq("slug", "zimbads")
    .single();

  if (!community) {
    return NextResponse.json({
      error: "Community not found",
      slug: "zimbads"
    });
  }

  // Try to get orders for this community through events
  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      *,
      events!inner (
        id,
        title,
        community_id
      )
    `)
    .eq("events.community_id", community.id)
    .limit(5);

  // Also check if there are any events for this community
  const { data: events } = await supabase
    .from("events")
    .select("id, title, community_id")
    .eq("community_id", community.id)
    .limit(5);

  // Check tickets table
  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, order_id, event_id")
    .limit(5);

  return NextResponse.json({
    community: {
      id: community.id,
      name: community.name,
      slug: community.slug
    },
    orders: {
      count: orders?.length || 0,
      data: orders || [],
      error: error?.message
    },
    events: {
      count: events?.length || 0,
      data: events || []
    },
    tickets: {
      count: tickets?.length || 0,
      data: tickets || []
    },
    debugInfo: {
      ordersQuery: "orders with events.community_id filter",
      hasOrders: (orders?.length || 0) > 0,
      hasEvents: (events?.length || 0) > 0,
      hasTickets: (tickets?.length || 0) > 0
    }
  });
}