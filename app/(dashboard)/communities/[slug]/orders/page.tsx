import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderList } from "@/components/orders/OrderList";
import { OrderExportDialog } from "@/components/orders/OrderExportDialog";
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
  params: {
    slug: string;
  };
  searchParams: {
    status?: string;
    search?: string;
    page?: string;
  };
}

async function getCommunity(slug: string) {
  const supabase = createClient();

  const { data: community } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", slug)
    .single();

  return community;
}

async function checkAccess(communityId: string) {
  const supabase = createClient();
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
  const supabase = createClient();
  const pageSize = 20;
  const page = filters.page || 1;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("orders")
    .select(
      `
      *,
      event:events!inner (
        id,
        title,
        start_at,
        community_id
      ),
      buyer:profiles!orders_user_id_fkey (
        id,
        email,
        name,
        avatar_url
      )
    `,
      { count: "exact" }
    )
    .eq("event.community_id", communityId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.search) {
    query = query.or(
      `order_number.ilike.%${filters.search}%,buyer.email.ilike.%${filters.search}%`
    );
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching orders:", error);
    return { orders: [], totalCount: 0 };
  }

  return {
    orders: data || [],
    totalCount: count || 0,
  };
}

async function getOrderStats(communityId: string) {
  const supabase = createClient();

  // Get order statistics for the community
  const { data: stats } = await supabase.rpc("get_community_order_stats", {
    p_community_id: communityId,
  });

  return stats || {
    total_orders: 0,
    total_revenue: 0,
    total_fees: 0,
    total_refunded: 0,
    pending_orders: 0,
    completed_orders: 0,
  };
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
  const community = await getCommunity(params.slug);

  if (!community) {
    notFound();
  }

  const hasAccess = await checkAccess(community.id);

  if (!hasAccess) {
    notFound();
  }

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  const [{ orders, totalCount }, stats] = await Promise.all([
    getOrders(community.id, {
      status: searchParams.status,
      search: searchParams.search,
      page,
    }),
    getOrderStats(community.id),
  ]);

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
                <OrderList
                  orders={orders}
                  totalCount={totalCount}
                  onOrderClick={(order) => {
                    window.location.href = `/orders/${order.id}`;
                  }}
                  onExport={() => {
                    // Handle export
                  }}
                  onRefresh={() => {
                    window.location.reload();
                  }}
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
              <OrderList
                orders={orders.filter((o) => o.status === "paid")}
                totalCount={orders.filter((o) => o.status === "paid").length}
                onOrderClick={(order) => {
                  window.location.href = `/orders/${order.id}`;
                }}
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
              <OrderList
                orders={orders.filter((o) => o.status === "pending")}
                totalCount={orders.filter((o) => o.status === "pending").length}
                onOrderClick={(order) => {
                  window.location.href = `/orders/${order.id}`;
                }}
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
              <OrderList
                orders={orders.filter(
                  (o) => o.status === "refunded" || o.status === "partially_refunded"
                )}
                totalCount={
                  orders.filter(
                    (o) => o.status === "refunded" || o.status === "partially_refunded"
                  ).length
                }
                onOrderClick={(order) => {
                  window.location.href = `/orders/${order.id}`;
                }}
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
              <OrderList
                orders={orders.filter((o) => o.status === "failed")}
                totalCount={orders.filter((o) => o.status === "failed").length}
                onOrderClick={(order) => {
                  window.location.href = `/orders/${order.id}`;
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}