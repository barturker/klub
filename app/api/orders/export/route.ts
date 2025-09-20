import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  console.log("[EXPORT_DEBUG] ========== Export POST request started ==========");
  console.log("[EXPORT_DEBUG] Timestamp:", new Date().toISOString());

  try {
    console.log("[EXPORT_DEBUG] Creating Supabase client...");
    const supabase = await createClient();
    console.log("[EXPORT_DEBUG] Supabase client created successfully");

    // Check authentication
    console.log("[EXPORT_DEBUG] Checking authentication...");
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log("[EXPORT_DEBUG] Auth result:", {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message || null
    });

    if (authError || !user) {
      console.log("[EXPORT_DEBUG] Authentication failed:", authError?.message || "No user");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[EXPORT_DEBUG] User authenticated successfully:", user.id);

    console.log("[EXPORT_DEBUG] Parsing request body...");
    const body = await request.json();
    console.log("[EXPORT_DEBUG] Request body:", body);

    const {
      event_id,
      community_id,
      date_from,
      date_to,
      format = "csv",
      columns = []
    } = body;

    console.log("[EXPORT_DEBUG] Parsed parameters:", {
      event_id,
      community_id,
      date_from,
      date_to,
      format,
      columns
    });

    // Validate required parameters
    console.log("[EXPORT_DEBUG] Validating required parameters...");
    if (!community_id) {
      console.log("[EXPORT_DEBUG] Validation failed: community_id is required");
      return NextResponse.json(
        { error: "community_id is required" },
        { status: 400 }
      );
    }
    console.log("[EXPORT_DEBUG] Required parameters validated successfully");

    // Check user has admin/moderator access to the community
    console.log("[EXPORT_DEBUG] Checking user permissions for community:", community_id);
    const { data: member, error: memberError } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", community_id)
      .eq("user_id", user.id)
      .single();

    console.log("[EXPORT_DEBUG] Member query result:", {
      hasData: !!member,
      role: member?.role,
      error: memberError?.message || null
    });

    if (!member || (member.role !== "admin" && member.role !== "moderator")) {
      console.log("[EXPORT_DEBUG] Permission denied:", {
        memberExists: !!member,
        role: member?.role,
        requiredRoles: ["admin", "moderator"]
      });
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    console.log("[EXPORT_DEBUG] User has valid permissions:", member.role);

    // Validate format
    console.log("[EXPORT_DEBUG] Validating format:", format);
    if (!["csv", "excel", "pdf"].includes(format)) {
      console.log("[EXPORT_DEBUG] Invalid format provided:", format);
      return NextResponse.json(
        { error: "Invalid format. Must be csv, excel, or pdf" },
        { status: 400 }
      );
    }
    console.log("[EXPORT_DEBUG] Format validation passed");

    // Create export record
    console.log("[EXPORT_DEBUG] Creating export record...");
    const exportRecordData = {
      community_id,
      event_id: event_id || null,
      export_type: format,
      date_range_start: date_from || null,
      date_range_end: date_to || null,
      status: "pending",
      requested_by: user.id
    };
    console.log("[EXPORT_DEBUG] Export record data:", exportRecordData);

    const { data: exportRecord, error: exportError } = await supabase
      .from("order_exports")
      .insert(exportRecordData)
      .select()
      .single();

    console.log("[EXPORT_DEBUG] Export record creation result:", {
      success: !exportError,
      recordId: exportRecord?.id,
      error: exportError?.message || null,
      errorDetails: exportError
    });

    if (exportError) {
      console.error("[EXPORT_DEBUG] Error creating export record:", exportError);
      return NextResponse.json(
        { error: "Failed to create export job", details: exportError.message },
        { status: 500 }
      );
    }

    console.log("[EXPORT_DEBUG] Export record created successfully:", exportRecord.id);

    // Build query for orders
    console.log("[EXPORT_DEBUG] Building orders query...");
    console.log("[EXPORT_DEBUG] Query filters:", {
      community_id,
      event_id,
      date_from,
      date_to
    });

    let query = supabase
      .from("orders")
      .select(`
        *,
        events!inner (
          id,
          title,
          start_at,
          community_id
        ),
        tickets (
          id,
          ticket_code,
          status
        ),
        refunds (
          id,
          amount_cents,
          reason,
          status,
          created_at
        )
      `)
      .eq("events.community_id", community_id);

    console.log("[EXPORT_DEBUG] Base query built with community filter - fixed");

    // Add filters
    if (event_id) {
      console.log("[EXPORT_DEBUG] Adding event_id filter:", event_id);
      query = query.eq("event_id", event_id);
    }
    if (date_from) {
      console.log("[EXPORT_DEBUG] Adding date_from filter:", date_from);
      query = query.gte("created_at", date_from);
    }
    if (date_to) {
      console.log("[EXPORT_DEBUG] Adding date_to filter:", date_to);
      query = query.lte("created_at", date_to);
    }

    console.log("[EXPORT_DEBUG] Executing orders query...");
    // Execute query
    const { data: orders, error: ordersError } = await query.order("created_at", { ascending: false });

    console.log("[EXPORT_DEBUG] Orders query result:", {
      success: !ordersError,
      ordersCount: orders?.length || 0,
      error: ordersError?.message || null,
      errorDetails: ordersError
    });

    if (ordersError) {
      console.error("[EXPORT_DEBUG] Error fetching orders for export:", ordersError);

      // Update export status to failed
      console.log("[EXPORT_DEBUG] Updating export record status to failed...");
      const { error: updateError } = await supabase
        .from("order_exports")
        .update({ status: "failed" })
        .eq("id", exportRecord.id);

      if (updateError) {
        console.error("[EXPORT_DEBUG] Failed to update export status:", updateError);
      }

      return NextResponse.json(
        { error: "Failed to fetch orders", details: ordersError.message },
        { status: 500 }
      );
    }

    // Generate export data based on format
    console.log("[EXPORT_DEBUG] Starting data generation...");
    console.log("[EXPORT_DEBUG] Orders to process:", orders?.length || 0);

    let exportContent: string;
    let contentType: string;
    let filename: string;

    try {
      console.log("[EXPORT_DEBUG] Generating export in format:", format);

      switch (format) {
        case "csv":
          console.log("[EXPORT_DEBUG] Generating CSV...");
          exportContent = generateCSV(orders || [], columns);
          contentType = "text/csv";
          filename = `orders_export_${exportRecord.id}.csv`;
          break;
        case "excel":
          console.log("[EXPORT_DEBUG] Generating Excel (using CSV format)...");
          // For now, we'll use CSV format and let the client handle Excel conversion
          exportContent = generateCSV(orders || [], columns);
          contentType = "text/csv";
          filename = `orders_export_${exportRecord.id}.csv`;
          break;
        case "pdf":
          console.log("[EXPORT_DEBUG] Generating PDF (using CSV fallback)...");
          exportContent = generateCSV(orders || [], columns); // Simple fallback for now
          contentType = "text/csv";
          filename = `orders_export_${exportRecord.id}.csv`;
          break;
        default:
          throw new Error("Unsupported format");
      }

      console.log("[EXPORT_DEBUG] Export data generated successfully:", {
        dataLength: exportContent.length,
        contentType,
        filename
      });

      // For now, we'll return the data directly instead of storing it
      // In a production environment, you'd want to store this in a file storage service
      const fileUrl = `data:${contentType};base64,${Buffer.from(exportContent).toString('base64')}`;
      console.log("[EXPORT_DEBUG] Created data URL, length:", fileUrl.length);

      // Update export record with success
      console.log("[EXPORT_DEBUG] Updating export record to completed...");
      const { error: updateError } = await supabase
        .from("order_exports")
        .update({
          status: "completed",
          file_url: fileUrl
        })
        .eq("id", exportRecord.id);

      if (updateError) {
        console.error("[EXPORT_DEBUG] Failed to update export record:", updateError);
        throw new Error("Failed to update export record");
      }

      console.log("[EXPORT_DEBUG] Export completed successfully!");

      return NextResponse.json({
        export_id: exportRecord.id,
        status: "completed",
        download_url: `/api/exports/${exportRecord.id}/download`,
        filename
      });

    } catch (error) {
      console.error("[EXPORT_DEBUG] Error generating export:", error);

      // Update export status to failed
      console.log("[EXPORT_DEBUG] Updating export status to failed due to error...");
      const { error: updateError } = await supabase
        .from("order_exports")
        .update({ status: "failed" })
        .eq("id", exportRecord.id);

      if (updateError) {
        console.error("[EXPORT_DEBUG] Failed to update export status:", updateError);
      }

      return NextResponse.json(
        { error: "Failed to generate export", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("[EXPORT_DEBUG] ========== FATAL ERROR in orders export POST ==========");
    console.error("[EXPORT_DEBUG] Error details:", error);
    console.error("[EXPORT_DEBUG] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("[EXPORT_DEBUG] ========== END FATAL ERROR ==========");

    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function generateCSV(orders: any[], selectedColumns: string[]): string {
  // Define all available columns
  const allColumns = [
    { key: "order_number", label: "Order Number" },
    { key: "id", label: "Order ID" },
    { key: "buyer_name", label: "Buyer Name" },
    { key: "buyer_email", label: "Buyer Email" },
    { key: "event_title", label: "Event" },
    { key: "status", label: "Status" },
    { key: "amount_cents", label: "Amount (cents)" },
    { key: "amount_formatted", label: "Amount" },
    { key: "fee_cents", label: "Fee (cents)" },
    { key: "fee_formatted", label: "Fee" },
    { key: "total_tickets", label: "Tickets" },
    { key: "ticket_status", label: "Ticket Status" },
    { key: "refund_amount", label: "Refund Amount" },
    { key: "created_at", label: "Order Date" },
    { key: "event_start_at", label: "Event Date" }
  ];

  // Use selected columns or default to all
  const columns = selectedColumns.length > 0
    ? allColumns.filter(col => selectedColumns.includes(col.key))
    : allColumns;

  // Generate CSV header
  const header = columns.map(col => `"${col.label}"`).join(",");

  // Generate CSV rows
  const rows = orders.map(order => {
    const orderNumber = order.id.slice(0, 8).toUpperCase();
    const amountFormatted = `$${(order.amount_cents / 100).toFixed(2)}`;
    const feeFormatted = `$${((order.fee_cents || 0) / 100).toFixed(2)}`;
    const totalTickets = order.tickets?.length || 0;
    const ticketStatus = order.tickets?.[0]?.status || "";
    const refundAmount = order.refunds?.reduce((sum: number, refund: any) =>
      sum + (refund.status === "succeeded" ? refund.amount_cents : 0), 0) || 0;
    const refundFormatted = refundAmount > 0 ? `$${(refundAmount / 100).toFixed(2)}` : "";

    const rowData: Record<string, string> = {
      order_number: orderNumber,
      id: order.id,
      buyer_name: order.buyer_name || "",
      buyer_email: order.buyer_email || "",
      event_title: order.events?.title || "",
      status: order.status,
      amount_cents: order.amount_cents.toString(),
      amount_formatted: amountFormatted,
      fee_cents: (order.fee_cents || 0).toString(),
      fee_formatted: feeFormatted,
      total_tickets: totalTickets.toString(),
      ticket_status: ticketStatus,
      refund_amount: refundFormatted,
      created_at: new Date(order.created_at).toISOString().split('T')[0],
      event_start_at: order.events?.start_at ? new Date(order.events.start_at).toISOString().split('T')[0] : ""
    };

    return columns.map(col => `"${rowData[col.key] || ""}"`).join(",");
  }).join("\n");

  return `${header}\n${rows}`;
}