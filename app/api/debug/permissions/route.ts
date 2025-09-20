import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    console.log("[PERMISSIONS_DEBUG] ========== USER PERMISSIONS CHECK ==========");

    const communityId = "425ed2b0-f1fb-49a0-97b0-08da0d3901b0"; // zimbads community

    // Check user permissions using the debug function
    const { data: permissions, error: permError } = await supabase
      .rpc('debug_user_permissions', {
        p_community_id: communityId
      });

    console.log("[PERMISSIONS_DEBUG] User permissions result:", {
      success: !permError,
      error: permError?.message || null,
      permissions
    });

    // Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    console.log("[PERMISSIONS_DEBUG] Current user:", {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      error: userError?.message || null
    });

    // Check community members directly
    const { data: members, error: membersError } = await supabase
      .from("community_members")
      .select("*")
      .eq("community_id", communityId);

    console.log("[PERMISSIONS_DEBUG] Community members:", {
      success: !membersError,
      count: members?.length || 0,
      error: membersError?.message || null,
      members
    });

    // Check if user is in community members
    const userMembership = members?.find(m => m.user_id === user?.id);
    console.log("[PERMISSIONS_DEBUG] User membership:", userMembership || "NOT FOUND");

    return NextResponse.json({
      success: true,
      currentUser: {
        hasUser: !!user,
        userId: user?.id,
        email: user?.email
      },
      permissions: permissions || [],
      communityMembers: {
        count: members?.length || 0,
        members: members || [],
        userMembership: userMembership || null
      }
    });

  } catch (error) {
    console.error("[PERMISSIONS_DEBUG] Error:", error);
    return NextResponse.json({
      error: "Permissions debug failed",
      details: error
    }, { status: 500 });
  }
}