'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  IconUsers,
  IconCalendarEvent,
  IconTicket,
  IconTrendingUp,
  IconArrowUp,
  IconArrowDown,
  IconPlus,
  IconActivity,
  IconClock,
  IconStar,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { RevenueChart, EventCategoriesChart, CommunityGrowthChart } from '@/components/dashboard/LazyDashboardCharts';
import type { User } from '@supabase/supabase-js';

interface Activity {
  type: 'member_joined' | 'ticket_purchased' | 'event_created';
  timestamp: string;
  user: string;
  community?: string;
  event?: string;
  amount?: number;
}

interface UpcomingEvent {
  id: string;
  title?: string;
  name?: string;
  date: string;
  max_attendees?: number;
  status?: string;
}

interface DashboardStats {
  communities: number;
  events: number;
  tickets: number;
  revenue: number;
  recentActivities: Activity[];
  upcomingEvents: UpcomingEvent[];
}

interface AnalyticsData {
  revenueData: Array<{ month: string; revenue: number; tickets: number }>;
  communityGrowth: Array<{ day: string; members: number }>;
  eventCategories: Array<{ name: string; value: number; color: string }>;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    communities: 0,
    events: 0,
    tickets: 0,
    revenue: 0,
    recentActivities: [],
    upcomingEvents: []
  });
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    revenueData: [],
    communityGrowth: [],
    eventCategories: []
  });
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard stats
      const [statsResponse, analyticsResponse] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/analytics')
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData);
      }

      // Get user info from localStorage or session
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Use fallback data
      setStats({
        communities: 0,
        events: 0,
        tickets: 0,
        revenue: 0,
        recentActivities: [],
        upcomingEvents: []
      });
      setAnalytics({
        revenueData: [],
        communityGrowth: [],
        eventCategories: []
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    trend 
  }: { 
    title: string; 
    value: string | number; 
    change: string; 
    icon: React.ComponentType<{ className?: string }>; 
    trend: 'up' | 'down' 
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center text-xs text-muted-foreground">
          {trend === 'up' ? (
            <IconArrowUp className="mr-1 h-3 w-3 text-green-500" />
          ) : (
            <IconArrowDown className="mr-1 h-3 w-3 text-red-500" />
          )}
          <span className={cn(
            trend === 'up' ? 'text-green-500' : 'text-red-500'
          )}>
            {change}
          </span>
          <span className="ml-1">from last month</span>
        </div>
      </CardContent>
    </Card>
  );

  // Format recent activities for display
  const formatActivity = (activity: Activity) => {
    const timeAgo = getTimeAgo(activity.timestamp);
    
    if (activity.type === 'member_joined') {
      return {
        user: activity.user,
        action: 'joined community',
        target: activity.community,
        time: timeAgo,
        avatar: null
      };
    } else if (activity.type === 'ticket_purchased') {
      return {
        user: activity.user,
        action: 'purchased tickets for',
        target: activity.event,
        time: timeAgo,
        avatar: null
      };
    }
    return null;
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'just now';
  };

  const recentActivities = stats.recentActivities
    .map(formatActivity)
    .filter(Boolean)
    .slice(0, 5);

  // Format upcoming events
  const upcomingEvents = stats.upcomingEvents.map((event: UpcomingEvent) => ({
    id: event.id,
    name: event.title || event.name,
    date: new Date(event.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }),
    attendees: event.max_attendees || 100,
    status: event.status || 'upcoming'
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <IconActivity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back{user ? `, ${user.name || user.email?.split('@')[0]}` : ''}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Here's what's happening with your communities today.
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Link href="/communities/new">
            <Button>
              <IconPlus className="h-4 w-4 mr-2" />
              Create Community
            </Button>
          </Link>
          <Link href="/events/new">
            <Button variant="outline">
              <IconCalendarEvent className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Communities"
          value={stats.communities}
          change="+12.5%"
          icon={IconUsers}
          trend="up"
        />
        <StatCard
          title="Active Events"
          value={stats.events}
          change="+8.2%"
          icon={IconCalendarEvent}
          trend="up"
        />
        <StatCard
          title="Tickets Sold"
          value={stats.tickets.toLocaleString()}
          change="-2.4%"
          icon={IconTicket}
          trend="down"
        />
        <StatCard
          title="Total Revenue"
          value={`$${stats.revenue.toLocaleString()}`}
          change="+15.3%"
          icon={IconTrendingUp}
          trend="up"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Revenue Chart */}
        <RevenueChart data={analytics.revenueData} />

        {/* Event Categories */}
        <EventCategoriesChart data={analytics.eventCategories} />
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="events">Upcoming Events</TabsTrigger>
          <TabsTrigger value="growth">Community Growth</TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest actions in your communities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.length > 0 ? recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={activity.avatar || ''} />
                      <AvatarFallback>
                        {activity.user.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">{activity.user}</span>
                        {' '}{activity.action}{' '}
                        <span className="font-medium">{activity.target}</span>
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center">
                        <IconClock className="h-3 w-3 mr-1" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent activity to display
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Events scheduled in your communities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{event.name}</p>
                      <p className="text-sm text-muted-foreground">{event.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {event.attendees} attendees
                      </span>
                      {event.status === 'selling-fast' && (
                        <Badge variant="destructive">Selling Fast</Badge>
                      )}
                      {event.status === 'upcoming' && (
                        <Badge variant="secondary">Upcoming</Badge>
                      )}
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming events scheduled
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth">
          <CommunityGrowthChart data={analytics.communityGrowth} />
        </TabsContent>
      </Tabs>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <IconStar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8</div>
            <Progress value={96} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">Based on 1,234 reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <IconActivity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">892</div>
            <Progress value={75} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">75% of total members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <IconTrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <Progress value={94} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">Events successfully completed</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}