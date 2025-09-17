import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  const supabase = await createClient();

  // First check if event exists without any authentication
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug || "xcededed")
    .single();

  // Also check with ID
  const { data: eventById, error: errorById } = await supabase
    .from("events")
    .select("*")
    .eq("id", "a5e5f8f1-e600-4ee8-b2ac-d9ffdebf8ddc")
    .single();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  return Response.json({
    slug_search: {
      slug: slug || "xcededed",
      event,
      error
    },
    id_search: {
      id: "a5e5f8f1-e600-4ee8-b2ac-d9ffdebf8ddc",
      event: eventById,
      error: errorById
    },
    current_user: user?.id || "anonymous"
  });
}