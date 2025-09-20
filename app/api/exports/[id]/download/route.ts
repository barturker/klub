import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get export record
    const { data: exportRecord, error: exportError } = await supabase
      .from("order_exports")
      .select(`
        *,
        communities!inner (
          id,
          name
        )
      `)
      .eq("id", id)
      .single();

    if (exportError || !exportRecord) {
      return NextResponse.json(
        { error: "Export not found" },
        { status: 404 }
      );
    }

    // Check user has access to this export (must be admin/moderator of the community)
    const { data: member } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", exportRecord.community_id)
      .eq("user_id", user.id)
      .single();

    if (!member || (member.role !== "admin" && member.role !== "moderator")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if export is completed
    if (exportRecord.status !== "completed") {
      return NextResponse.json(
        { error: `Export is ${exportRecord.status}` },
        { status: 400 }
      );
    }

    if (!exportRecord.file_url) {
      return NextResponse.json(
        { error: "Export file not available" },
        { status: 400 }
      );
    }

    // If it's a data URL, extract the content
    if (exportRecord.file_url.startsWith("data:")) {
      const [header, base64Data] = exportRecord.file_url.split(",");
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : "text/csv";

      const buffer = Buffer.from(base64Data, "base64");

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const communityName = exportRecord.communities.name.replace(/[^a-zA-Z0-9]/g, '_');
      const extension = exportRecord.export_type === "csv" ? "csv" : "csv"; // For now, everything is CSV
      const filename = `${communityName}_orders_${timestamp}.${extension}`;

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": buffer.length.toString(),
        },
      });
    }

    // For file URLs (if implemented later), you would redirect or stream the file
    return NextResponse.json(
      { error: "File download not implemented for this URL type" },
      { status: 500 }
    );

  } catch (error) {
    console.error("Error in export download GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}