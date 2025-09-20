"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  DollarSign,
  ShoppingCart,
  RefreshCcw,
  Clock,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface OrderStatsProps {
  totalOrders: number;
  totalRevenue: number;
  totalFees: number;
  totalRefunded: number;
  pendingOrders: number;
  completedOrders: number;
  previousPeriod?: {
    totalOrders: number;
    totalRevenue: number;
  };
}

export function OrderStats({
  totalOrders = 0,
  totalRevenue = 0,
  totalFees = 0,
  totalRefunded = 0,
  pendingOrders = 0,
  completedOrders = 0,
  previousPeriod,
}: OrderStatsProps) {
  // Ensure all values are numbers and not null/undefined
  const safeOrders = Number(totalOrders) || 0;
  const safeRevenue = Number(totalRevenue) || 0;
  const safeFees = Number(totalFees) || 0;
  const safeRefunded = Number(totalRefunded) || 0;
  const safePending = Number(pendingOrders) || 0;
  const safeCompleted = Number(completedOrders) || 0;

  const netRevenue = safeRevenue - safeFees - safeRefunded;
  const completionRate = safeOrders > 0
    ? Math.round((safeCompleted / safeOrders) * 100)
    : 0;

  const revenueChange = previousPeriod && previousPeriod.totalRevenue > 0
    ? ((safeRevenue - previousPeriod.totalRevenue) / previousPeriod.totalRevenue) * 100
    : 0;

  const orderChange = previousPeriod && previousPeriod.totalOrders > 0
    ? ((safeOrders - previousPeriod.totalOrders) / previousPeriod.totalOrders) * 100
    : 0;

  const stats = [
    {
      title: "Total Orders",
      value: safeOrders.toLocaleString(),
      icon: ShoppingCart,
      description: `${safePending} pending`,
      change: orderChange,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Gross Revenue",
      value: formatCurrency(safeRevenue),
      icon: DollarSign,
      description: `${formatCurrency(safeFees)} in fees`,
      change: revenueChange,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Net Revenue",
      value: formatCurrency(netRevenue),
      icon: TrendingUp,
      description: `After fees & refunds`,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Refunded",
      value: formatCurrency(safeRefunded),
      icon: RefreshCcw,
      description: `${safeRevenue > 0 ? Math.round((safeRefunded / safeRevenue) * 100) : 0}% of revenue`,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Completion Rate",
      value: `${completionRate}%`,
      icon: CheckCircle,
      description: `${safeCompleted} completed`,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Pending Orders",
      value: safePending.toLocaleString(),
      icon: Clock,
      description: "Awaiting payment",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
                {stat.change !== undefined && stat.change !== 0 && (
                  <div
                    className={`flex items-center text-xs ${
                      stat.change > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {stat.change > 0 ? (
                      <ArrowUpIcon className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowDownIcon className="h-3 w-3 mr-1" />
                    )}
                    {Math.abs(stat.change).toFixed(1)}%
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}