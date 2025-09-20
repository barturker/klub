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
  console.log("🔍 [DEBUG] getOrders called with:", {
    communityId,
    filters,
    timestamp: new Date().toISOString()
  });

  const supabase = await createClient();
  console.log("✅ [DEBUG] Supabase client created");

  const pageSize = 20;
  const page = filters.page || 1;
  const offset = (page - 1) * pageSize;

  console.log("📊 [DEBUG] Pagination:", { page, pageSize, offset });

  // First, let's check if the tables exist and have data
  const { data: eventsCheck, error: eventsError } = await supabase
    .from("events")
    .select("id, title, community_id")
    .eq("community_id", communityId)
    .limit(1);

  console.log("🎯 [DEBUG] Events check:", {
    eventsFound: eventsCheck?.length || 0,
    eventsError,
    communityId
  });

  // Build the query step by step with better error handling
  // Note: orders table has event_id foreign key referencing events table
  let query = supabase
    .from("orders")
    .select(
      `
      *,
      events!event_id (
        id,
        title,
        start_at,
        community_id
      )
    `,
      { count: "exact" }
    );

  // Filter by community through events join
  query = query.eq("events.community_id", communityId);

  // Add status filter if provided
  if (filters.status) {
    console.log("🏷️ [DEBUG] Adding status filter:", filters.status);
    query = query.eq("status", filters.status);
  }

  // Add search filter if provided
  if (filters.search) {
    console.log("🔎 [DEBUG] Adding search filter:", filters.search);
    // Search in ID (as order number) or buyer email
    query = query.or(
      `id.ilike.%${filters.search}%,buyer_email.ilike.%${filters.search}%,buyer_name.ilike.%${filters.search}%`
    );
  }

  // Add ordering and pagination
  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  console.log("📤 [DEBUG] Executing query...");
  const { data, count, error } = await query;

  console.log("📥 [DEBUG] Query result:", {
    dataCount: data?.length || 0,
    totalCount: count,
    hasError: !!error,
    errorDetails: error ? {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    } : null
  });

  if (error) {
    console.error("❌ [ERROR] Failed to fetch orders:", {
      error,
      communityId,
      filters,
      timestamp: new Date().toISOString()
    });

    // Return empty but valid structure
    return { orders: [], totalCount: 0 };
  }

  // Transform data to ensure proper mapping
  const transformedOrders = (data || []).map(order => ({
    ...order,
    order_number: order.id.slice(0, 8).toUpperCase(), // Generate order number from ID
    event: order.events,
    buyer: {
      id: order.buyer_id,
      email: order.buyer_email,
      name: order.buyer_name,
      avatar_url: null
    }
  }));

  console.log("✅ [DEBUG] Orders fetched successfully:", {
    ordersCount: transformedOrders.length,
    totalCount: count || 0
  });

  return {
    orders: transformedOrders,
    totalCount: count || 0,
  };
}

async function getOrderStats(communityId: string) {
  console.log("📈 [DEBUG] getOrderStats called with communityId:", communityId);

  const supabase = await createClient();
  console.log("✅ [DEBUG] Supabase client created for stats");

  // Get order statistics for the community
  console.log("🎲 [DEBUG] Calling RPC function get_community_order_stats...");

  const { data: stats, error } = await supabase.rpc("get_community_order_stats", {
    p_community_id: communityId,
  });

  console.log("📊 [DEBUG] Stats result:", {
    hasData: !!stats,
    hasError: !!error,
    stats,
    error: error ? {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    } : null
  });

  if (error) {
    console.error("❌ [ERROR] Failed to fetch order stats:", {
      error,
      communityId,
      timestamp: new Date().toISOString()
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

  return stats || defaultStats;
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
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  console.log("🚀 [DEBUG] OrdersPage started:", {
    slug: resolvedParams.slug,
    searchParams: resolvedSearchParams,
    timestamp: new Date().toISOString()
  });

  const community = await getCommunity(resolvedParams.slug);
  console.log("🏛️ [DEBUG] Community fetched:", {
    found: !!community,
    id: community?.id,
    name: community?.name,
    slug: community?.slug
  });

  if (!community) {
    console.warn("⚠️ [DEBUG] Community not found, returning 404");
    notFound();
  }

  const hasAccess = await checkAccess(community.id);
  console.log("🔐 [DEBUG] Access check result:", hasAccess);

  if (!hasAccess) {
    console.warn("🚫 [DEBUG] User does not have access, returning 404");
    notFound();
  }

  const page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page, 10) : 1;
  console.log("📄 [DEBUG] Page number:", page);

  console.log("🔄 [DEBUG] Fetching orders and stats in parallel...");

  try {
    const [ordersResult, statsResult] = await Promise.all([
      getOrders(community.id, {
        status: resolvedSearchParams.status,
        search: resolvedSearchParams.search,
        page,
      }).catch(error => {
        console.error("❌ [ERROR] getOrders failed:", error);
        return { orders: [], totalCount: 0 };
      }),
      getOrderStats(community.id).catch(error => {
        console.error("❌ [ERROR] getOrderStats failed:", error);
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

    console.log("🎉 [DEBUG] Data fetched successfully:", {
      ordersCount: orders.length,
      totalCount,
      hasStats: !!stats,
      timestamp: new Date().toISOString()
    });

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
          totalOrders={stats.total_orders}
          totalRevenue={stats.total_revenue}
          totalFees={stats.total_fees}
          totalRefunded={stats.total_refunded}
          pendingOrders={stats.pending_orders}
          completedOrders={stats.completed_orders}
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