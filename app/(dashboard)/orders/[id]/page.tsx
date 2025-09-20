import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderDetailsWrapper } from "@/components/orders/OrderDetailsWrapper";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getOrderDetails(orderId: string) {
  console.log("[ORDER_DETAILS_DEBUG] ========== getOrderDetails STARTED ==========");
  console.log("[ORDER_DETAILS_DEBUG] Order ID:", orderId);

  const supabase = await createClient();

  // Get the current user to check access
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("[ORDER_DETAILS_DEBUG] No authenticated user");
    return null;
  }

  console.log("[ORDER_DETAILS_DEBUG] User ID:", user.id);

  // First get the order with basic information
  console.log("[ORDER_DETAILS_DEBUG] Fetching order data...");
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(`
      *,
      events!inner (
        id,
        title,
        start_at,
        community_id,
        communities!inner (
          id,
          name,
          slug
        )
      )
    `)
    .eq("id", orderId)
    .single();

  console.log("[ORDER_DETAILS_DEBUG] Order query result:", {
    success: !orderError,
    hasOrder: !!order,
    error: orderError?.message || null
  });

  if (orderError || !order) {
    console.error("[ORDER_DETAILS_DEBUG] Error fetching order:", orderError);
    return null;
  }

  // Check if user has access to this order
  // Either the user is the buyer, or they're an admin/moderator of the community
  console.log("[ORDER_DETAILS_DEBUG] Checking access...");

  const isBuyer = order.buyer_id === user.id;
  console.log("[ORDER_DETAILS_DEBUG] Is buyer:", isBuyer);

  if (!isBuyer) {
    // Check if user is admin/moderator of the community
    const { data: member } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", order.events.community_id)
      .eq("user_id", user.id)
      .single();

    const isManager = member?.role === "admin" || member?.role === "moderator";
    console.log("[ORDER_DETAILS_DEBUG] Is community manager:", isManager);

    if (!isManager) {
      console.log("[ORDER_DETAILS_DEBUG] Access denied");
      return null;
    }
  }

  console.log("[ORDER_DETAILS_DEBUG] Access granted, fetching additional data...");

  // Get tickets for this order
  const { data: tickets } = await supabase
    .from("tickets")
    .select(`
      *,
      ticket_tiers (
        name,
        price_cents
      )
    `)
    .eq("order_id", orderId);

  console.log("[ORDER_DETAILS_DEBUG] Tickets found:", tickets?.length || 0);

  // Get refunds for this order
  const { data: refunds } = await supabase
    .from("refunds")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  console.log("[ORDER_DETAILS_DEBUG] Refunds found:", refunds?.length || 0);

  // Get order modifications
  const { data: modifications } = await supabase
    .from("order_modifications")
    .select(`
      *,
      profiles!order_modifications_modified_by_fkey (
        id,
        full_name
      )
    `)
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  console.log("[ORDER_DETAILS_DEBUG] Modifications found:", modifications?.length || 0);

  // Get buyer profile information
  const { data: buyer } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", order.buyer_id)
    .single();

  console.log("[ORDER_DETAILS_DEBUG] Buyer profile found:", !!buyer);

  // Transform the data
  const transformedOrder = {
    ...order,
    order_number: order.id.slice(0, 8).toUpperCase(),
    event: {
      id: order.events.id,
      title: order.events.title,
      start_at: order.events.start_at,
      community: {
        name: order.events.communities.name,
        slug: order.events.communities.slug,
      },
    },
    buyer: buyer ? {
      id: buyer.id,
      email: order.buyer_email,
      name: buyer.full_name || order.buyer_name,
      avatar_url: buyer.avatar_url,
    } : {
      id: order.buyer_id,
      email: order.buyer_email,
      name: order.buyer_name,
      avatar_url: null,
    },
    tickets: tickets?.map(ticket => ({
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      status: ticket.status,
      tier: {
        name: ticket.ticket_tiers?.name || "General",
        price_cents: ticket.ticket_tiers?.price_cents || 0,
      },
    })) || [],
    refunds: refunds?.map(refund => ({
      id: refund.id,
      amount_cents: refund.amount_cents,
      reason: refund.reason || "No reason provided",
      created_at: refund.created_at,
      status: refund.status,
    })) || [],
    modifications: modifications?.map(mod => ({
      id: mod.id,
      type: mod.type,
      created_at: mod.created_at,
      modified_by: {
        name: mod.profiles?.full_name || "System",
      },
    })) || [],
  };

  console.log("[ORDER_DETAILS_DEBUG] ========== getOrderDetails COMPLETED ==========");
  return transformedOrder;
}

function OrderDetailsLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-[600px] w-full" />
    </div>
  );
}

export default async function OrderDetailsPage({
  params,
}: OrderDetailsPageProps) {
  console.log("[PAGE_DEBUG] ========================================");
  console.log("[PAGE_DEBUG] OrderDetailsPage RENDERING START");
  console.log("[PAGE_DEBUG] ========================================");

  const resolvedParams = await params;
  const orderId = resolvedParams.id;

  console.log("[PAGE_DEBUG] Order ID from params:", orderId);

  const order = await getOrderDetails(orderId);

  console.log("[PAGE_DEBUG] Order data:", {
    found: !!order,
    orderNumber: order?.order_number,
    status: order?.status,
    amount: order?.amount_cents,
  });

  if (!order) {
    console.log("[PAGE_DEBUG] Order not found or access denied");
    notFound();
  }


  console.log("[PAGE_DEBUG] ========================================");
  console.log("[PAGE_DEBUG] OrderDetailsPage RENDERING COMPLETE");
  console.log("[PAGE_DEBUG] ========================================");

  return (
    <div className="container mx-auto py-6">
      {/* Navigation */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/communities/${order.event.community?.slug}/orders`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Orders
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Order Details</h1>
          <p className="text-gray-500">
            Order #{order.order_number} for {order.event.title}
          </p>
        </div>
      </div>

      {/* Order Details */}
      <Suspense fallback={<OrderDetailsLoading />}>
        <OrderDetailsWrapper order={order} />
      </Suspense>
    </div>
  );
}