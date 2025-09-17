"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load the heavy Recharts components
const DashboardCharts = dynamic(
  () => import("./DashboardCharts"),
  {
    ssr: false,
    loading: () => <ChartSkeleton />
  }
);

const CommunityGrowthChart = dynamic(
  () => import("./DashboardCharts").then(mod => ({ default: mod.CommunityGrowthChart })),
  {
    ssr: false,
    loading: () => <SingleChartSkeleton />
  }
);

const RevenueChart = dynamic(
  () => import("./DashboardCharts").then(mod => ({ default: mod.RevenueChart })),
  {
    ssr: false,
    loading: () => <SingleChartSkeleton large />
  }
);

const EventCategoriesChart = dynamic(
  () => import("./DashboardCharts").then(mod => ({ default: mod.EventCategoriesChart })),
  {
    ssr: false,
    loading: () => <SingleChartSkeleton />
  }
);

function ChartSkeleton() {
  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </>
  );
}

function SingleChartSkeleton({ large }: { large?: boolean }) {
  return (
    <Card className={large ? "lg:col-span-2" : ""}>
      <CardHeader>
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

interface LazyDashboardChartsProps {
  analytics: {
    revenueData: Array<{ month: string; revenue: number }>;
    eventCategories: Array<{ name: string; value: number; color: string }>;
    communityGrowth: Array<{ day: string; members: number }>;
  };
  showGrowthChart?: boolean;
}

export default function LazyDashboardCharts({ analytics, showGrowthChart }: LazyDashboardChartsProps) {
  return <DashboardCharts analytics={analytics} showGrowthChart={showGrowthChart} />;
}

export { CommunityGrowthChart, RevenueChart, EventCategoriesChart };