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
  // Define all available columns - daha detaylı veriler ekleyelim
  const allColumns = [
    { key: "order_number", label: "Order Number" },
    { key: "id", label: "Order ID" },
    { key: "buyer_name", label: "Customer Name" },
    { key: "buyer_email", label: "Customer Email" },
    { key: "event_title", label: "Event Name" },
    { key: "status", label: "Order Status" },
    { key: "payment_status", label: "Payment Status" },
    { key: "amount_formatted", label: "Total Amount" },
    { key: "fee_formatted", label: "Platform Fee" },
    { key: "net_amount", label: "Net Amount" },
    { key: "currency", label: "Currency" },
    { key: "payment_method", label: "Payment Method" },
    { key: "quantity", label: "Quantity" },
    { key: "total_tickets", label: "Total Tickets" },
    { key: "ticket_codes", label: "Ticket Codes" },
    { key: "ticket_status", label: "Ticket Status" },
    { key: "refund_amount", label: "Refund Amount" },
    { key: "refund_status", label: "Refund Status" },
    { key: "created_at", label: "Order Date" },
    { key: "paid_at", label: "Payment Date" },
    { key: "event_start_at", label: "Event Date" },
    { key: "stripe_session_id", label: "Stripe Session ID" },
    { key: "stripe_payment_intent", label: "Payment Intent ID" }
  ];

  // Debug için gelen kolonları logla
  console.log("[EXPORT_DEBUG] Selected columns from client:", selectedColumns);

  // Use selected columns or default to important ones if none selected
  const columns = selectedColumns && selectedColumns.length > 0
    ? allColumns.filter(col => {
        // Dialog'dan gelen column key'leri ile bizim key'lerimizi eşleştirelim
        const clientToServerMapping: Record<string, string> = {
          'customer_name': 'buyer_name',
          'customer_email': 'buyer_email',
          'event_name': 'event_title',
          'amount': 'amount_formatted',
          'order_date': 'created_at'
        };

        // İki yönde kontrol et - hem direkt key hem de mapped key
        return selectedColumns.some(selectedKey => {
          const mappedSelected = clientToServerMapping[selectedKey] || selectedKey;
          return col.key === mappedSelected || col.key === selectedKey;
        });
      })
    : [
        // Varsayılan önemli kolonlar
        allColumns.find(c => c.key === "order_number"),
        allColumns.find(c => c.key === "buyer_name"),
        allColumns.find(c => c.key === "buyer_email"),
        allColumns.find(c => c.key === "event_title"),
        allColumns.find(c => c.key === "amount_formatted"),
        allColumns.find(c => c.key === "status"),
        allColumns.find(c => c.key === "created_at"),
        allColumns.find(c => c.key === "paid_at")
      ].filter(Boolean) as typeof allColumns;

  // Generate CSV header
  const header = columns.map(col => `"${col.label}"`).join(",");

  // Generate CSV rows
  const rows = orders.map(order => {
    const orderNumber = order.id.slice(0, 8).toUpperCase();
    const amountFormatted = `$${(order.amount_cents / 100).toFixed(2)}`;
    const feeFormatted = `$${((order.fee_cents || 0) / 100).toFixed(2)}`;
    const netAmount = `$${((order.amount_cents - (order.fee_cents || 0)) / 100).toFixed(2)}`;
    const totalTickets = order.tickets?.length || 0;
    const ticketCodes = order.tickets?.map((t: any) => t.ticket_code || '').filter(Boolean).join(', ') || "";
    const ticketStatus = order.tickets?.[0]?.status || "";

    // Refund bilgileri
    const refunds = order.refunds?.filter((r: any) => r.status === "succeeded") || [];
    const refundAmount = refunds.reduce((sum: number, refund: any) => sum + refund.amount_cents, 0) || 0;
    const refundFormatted = refundAmount > 0 ? `$${(refundAmount / 100).toFixed(2)}` : "";
    const refundStatus = refunds.length > 0 ? "Refunded" : "";

    // Payment durumu
    const paymentStatus = order.paid_at ? "Completed" : order.failed_at ? "Failed" : "Pending";

    // Tarih formatlama
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    };

    const formatDateOnly = (dateStr: string | null) => {
      if (!dateStr) return "";
      return new Date(dateStr).toLocaleDateString();
    };

    const rowData: Record<string, string> = {
      order_number: orderNumber,
      id: order.id,
      buyer_name: order.buyer_name || "N/A",
      buyer_email: order.buyer_email || "N/A",
      event_title: order.events?.title || "",
      status: order.status,
      payment_status: paymentStatus,
      amount_cents: order.amount_cents.toString(),
      amount_formatted: amountFormatted,
      fee_cents: (order.fee_cents || 0).toString(),
      fee_formatted: feeFormatted,
      net_amount: netAmount,
      currency: (order.currency || "usd").toUpperCase(),
      payment_method: order.payment_method || "card",
      quantity: (order.quantity || 1).toString(),
      total_tickets: totalTickets.toString(),
      ticket_codes: ticketCodes,
      ticket_status: ticketStatus,
      refund_amount: refundFormatted,
      refund_status: refundStatus,
      created_at: formatDate(order.created_at),
      paid_at: formatDate(order.paid_at),
      event_start_at: order.events?.start_at ? formatDate(order.events.start_at) : "",
      stripe_session_id: order.stripe_session_id || order.metadata?.stripe_session_id || "",
      stripe_payment_intent: order.stripe_payment_intent_id || ""
    };

    return columns.map(col => `"${rowData[col.key] || ""}"`).join(",");
  }).join("\n");

  return `${header}\n${rows}`;
}