import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderListWrapper } from "@/components/orders/OrderListWrapper";
import { OrderStats } from "@/components/orders/OrderStats";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface OrdersPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
  }>;
}

async function getCommunity(slug: string) {
  const supabase = await createClient();

  const { data: community } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", slug)
    .single();

  return community;
}

async function checkAccess(communityId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: member } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .single();

  return member?.role === "admin" || member?.role === "moderator";
}

async function getOrders(
  communityId: string,
  filters: {
    status?: string;
    search?: string;
    page?: number;
  }
) {
  console.log("[ORDERS_DEBUG] ========== getOrders STARTED ==========");
  console.log("[ORDERS_DEBUG] Input:", {
    communityId,
    filters,
    timestamp: new Date().toISOString()
  });

  const supabase = await createClient();

  const pageSize = 20;
  const page = filters.page || 1;
  const offset = (page - 1) * pageSize;

  console.log("[ORDERS_DEBUG] Pagination:", { page, pageSize, offset });

  // Build the query step by step with better error handling
  // Note: orders table has event_id foreign key referencing events table
  // Use inner join since Supabase has issues with the foreign key relationship
  console.log("[ORDERS_DEBUG] Building query for community:", communityId);

  let query = supabase
    .from("orders")
    .select(
      `
      *,
      events!inner (
        id,
        title,
        start_at,
        community_id
      )
    `,
      { count: "exact" }
    )
    .eq("events.community_id", communityId);

  console.log("[ORDERS_DEBUG] Base query built with events join");

  // Add status filter if provided
  if (filters.status) {
    console.log("[ORDERS_DEBUG] Adding status filter:", filters.status);
    query = query.eq("status", filters.status);
  }

  // Add search filter if provided
  if (filters.search) {
    console.log("[ORDERS_DEBUG] Adding search filter:", filters.search);
    // Search in ID (as order number) or buyer email
    query = query.or(
      `id.ilike.%${filters.search}%,buyer_email.ilike.%${filters.search}%,buyer_name.ilike.%${filters.search}%`
    );
  }

  // Add ordering and pagination
  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  console.log("[ORDERS_DEBUG] Executing query...");
  const { data, count, error } = await query;

  console.log("[ORDERS_DEBUG] Query result:", {
    success: !error,
    recordCount: data?.length || 0,
    totalCount: count,
    error: error?.message || null
  });

  if (error) {
    console.error("[ORDERS_DEBUG] ERROR fetching orders:", {
      error,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    // Return empty but valid structure
    return { orders: [], totalCount: 0 };
  }

  console.log("[ORDERS_DEBUG] Raw orders data:", data);

  // Transform data to ensure proper mapping
  console.log("[ORDERS_DEBUG] Transforming orders data...");

  const transformedOrders = (data || []).map((order, index) => {
    console.log(`[ORDERS_DEBUG] Order ${index + 1}:`, {
      id: order.id,
      status: order.status,
      amount: order.amount_cents,
      fee: order.fee_cents,
      buyer_email: order.buyer_email,
      buyer_name: order.buyer_name,
      event_title: order.events?.title,
      event_id: order.event_id,
      created_at: order.created_at
    });

    return {
      ...order,
      order_number: order.id.slice(0, 8).toUpperCase(), // Generate order number from ID
      event: order.events || null,
      buyer: {
        id: order.buyer_id,
        email: order.buyer_email,
        name: order.buyer_name,
        avatar_url: null
      }
    };
  });

  const result = {
    orders: transformedOrders,
    totalCount: count || 0,
  };

  console.log("[ORDERS_DEBUG] ========== getOrders COMPLETED ==========");
  console.log("[ORDERS_DEBUG] Final result:", {
    ordersCount: result.orders.length,
    totalCount: result.totalCount
  });

  return result;
}

async function getOrderStats(communityId: string) {
  console.log("[STATS_DEBUG] ========== getOrderStats STARTED ==========");
  console.log("[STATS_DEBUG] Community ID:", communityId);

  const supabase = await createClient();

  // Get order statistics for the community
  console.log("[STATS_DEBUG] Calling RPC function get_community_order_stats...");

  const { data: stats, error } = await supabase.rpc("get_community_order_stats", {
    p_community_id: communityId,
  });

  console.log("[STATS_DEBUG] RPC Response:", {
    hasData: !!stats,
    isArray: Array.isArray(stats),
    dataLength: Array.isArray(stats) ? stats.length : null,
    rawData: stats,
    error: error?.message || null
  });

  if (error) {
    console.error("[STATS_DEBUG] ERROR fetching stats:", {
      error,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
  }

  const defaultStats = {
    total_orders: 0,
    total_revenue: 0,
    total_fees: 0,
    total_refunded: 0,
    pending_orders: 0,
    completed_orders: 0,
  };

  // RPC function returns an array with one element, extract it
  const statsData = Array.isArray(stats) && stats.length > 0 ? stats[0] : stats;

  console.log("[STATS_DEBUG] Processed stats:", statsData);
  console.log("[STATS_DEBUG] ========== getOrderStats COMPLETED ==========");

  return statsData || defaultStats;
}

function OrdersLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

export default async function OrdersPage({
  params,
  searchParams,
}: OrdersPageProps) {
  console.log("[PAGE_DEBUG] ========================================");
  console.log("[PAGE_DEBUG] OrdersPage RENDERING START");
  console.log("[PAGE_DEBUG] ========================================");

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  console.log("[PAGE_DEBUG] Params:", {
    slug: resolvedParams.slug,
    searchParams: resolvedSearchParams,
    timestamp: new Date().toISOString()
  });

  const community = await getCommunity(resolvedParams.slug);

  console.log("[PAGE_DEBUG] Community:", {
    found: !!community,
    id: community?.id,
    name: community?.name,
    slug: community?.slug
  });

  if (!community) {
    notFound();
  }

  const hasAccess = await checkAccess(community.id);

  console.log("[PAGE_DEBUG] Access check:", hasAccess);

  if (!hasAccess) {
    notFound();
  }

  const page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page, 10) : 1;

  console.log("[PAGE_DEBUG] Starting parallel data fetch...");

  try {
    const [ordersResult, statsResult] = await Promise.all([
      getOrders(community.id, {
        status: resolvedSearchParams.status,
        search: resolvedSearchParams.search,
        page,
      }).catch(error => {
        console.error("[PAGE_DEBUG] getOrders promise failed:", error);
        return { orders: [], totalCount: 0 };
      }),
      getOrderStats(community.id).catch(error => {
        console.error("[PAGE_DEBUG] getOrderStats promise failed:", error);
        return {
          total_orders: 0,
          total_revenue: 0,
          total_fees: 0,
          total_refunded: 0,
          pending_orders: 0,
          completed_orders: 0,
        };
      }),
    ]);

    const { orders, totalCount } = ordersResult;
    const stats = statsResult;

    console.log("[PAGE_DEBUG] Data fetch completed:", {
      ordersCount: orders.length,
      totalCount,
      stats: {
        total_orders: stats?.total_orders,
        total_revenue: stats?.total_revenue,
        pending_orders: stats?.pending_orders,
        completed_orders: stats?.completed_orders
      }
    });

    console.log("[PAGE_DEBUG] ========================================");
    console.log("[PAGE_DEBUG] OrdersPage RENDERING COMPLETE");
    console.log("[PAGE_DEBUG] ========================================");

    return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Order Management</h1>
        <p className="text-gray-500 mt-1">
          Manage orders and refunds for {community.name}
        </p>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <OrderStats
          totalOrders={stats?.total_orders ?? 0}
          totalRevenue={stats?.total_revenue ?? 0}
          totalFees={stats?.total_fees ?? 0}
          totalRefunded={stats?.total_refunded ?? 0}
          pendingOrders={stats?.pending_orders ?? 0}
          completedOrders={stats?.completed_orders ?? 0}
        />
      </Suspense>

      {/* Orders Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="refunded">Refunded</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
              <CardDescription>
                View and manage all orders for your community events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<OrdersLoading />}>
                <OrderListWrapper
                  initialOrders={orders}
                  totalCount={totalCount}
                  communityId={community.id}
                />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paid">
          <Card>
            <CardHeader>
              <CardTitle>Paid Orders</CardTitle>
              <CardDescription>Successfully completed transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <OrderListWrapper
                initialOrders={orders.filter((o) => o.status === "paid")}
                totalCount={orders.filter((o) => o.status === "paid").length}
                communityId={community.id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Orders</CardTitle>
              <CardDescription>Orders awaiting payment</CardDescription>
            </CardHeader>
            <CardContent>
              <OrderListWrapper
                initialOrders={orders.filter((o) => o.status === "pending")}
                totalCount={orders.filter((o) => o.status === "pending").length}
                communityId={community.id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refunded">
          <Card>
            <CardHeader>
              <CardTitle>Refunded Orders</CardTitle>
              <CardDescription>
                Orders that have been fully or partially refunded
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrderListWrapper
                initialOrders={orders.filter(
                  (o) => o.status === "refunded" || o.status === "partially_refunded"
                )}
                totalCount={
                  orders.filter(
                    (o) => o.status === "refunded" || o.status === "partially_refunded"
                  ).length
                }
                communityId={community.id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed">
          <Card>
            <CardHeader>
              <CardTitle>Failed Orders</CardTitle>
              <CardDescription>Orders that failed to process</CardDescription>
            </CardHeader>
            <CardContent>
              <OrderListWrapper
                initialOrders={orders.filter((o) => o.status === "failed")}
                totalCount={orders.filter((o) => o.status === "failed").length}
                communityId={community.id}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
  } catch (error) {
    console.error("💥 [FATAL ERROR] OrdersPage rendering failed:", error);
    throw error;
  }
}