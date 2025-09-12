'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Mock data for charts
const revenueData = [
  { month: 'Jan', revenue: 4000, tickets: 240 },
  { month: 'Feb', revenue: 3000, tickets: 198 },
  { month: 'Mar', revenue: 5000, tickets: 300 },
  { month: 'Apr', revenue: 4500, tickets: 280 },
  { month: 'May', revenue: 6000, tickets: 350 },
  { month: 'Jun', revenue: 5500, tickets: 320 },
];

const communityGrowth = [
  { day: 'Mon', members: 120 },
  { day: 'Tue', members: 132 },
  { day: 'Wed', members: 145 },
  { day: 'Thu', members: 160 },
  { day: 'Fri', members: 178 },
  { day: 'Sat', members: 195 },
  { day: 'Sun', members: 210 },
];

const eventCategories = [
  { name: 'Music', value: 35, color: '#8b5cf6' },
  { name: 'Sports', value: 25, color: '#ec4899' },
  { name: 'Tech', value: 20, color: '#3b82f6' },
  { name: 'Art', value: 20, color: '#10b981' },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    communities: 0,
    events: 0,
    tickets: 0,
    revenue: 0,
  });
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Fetch actual data from database
      const [communitiesRes, eventsRes, ticketsRes] = await Promise.all([
        supabase.from('communities').select('*', { count: 'exact' }),
        supabase.from('events').select('*', { count: 'exact' }),
        supabase.from('tickets').select('*', { count: 'exact' }),
      ]);

      setStats({
        communities: communitiesRes.count || 12,
        events: eventsRes.count || 48,
        tickets: ticketsRes.count || 1250,
        revenue: 25600, // This would be calculated from actual ticket sales
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Use mock data as fallback
      setStats({
        communities: 12,
        events: 48,
        tickets: 1250,
        revenue: 25600,
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
    icon: any; 
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

  const recentActivities = [
    {
      id: 1,
      user: 'Alice Johnson',
      action: 'created a new event',
      target: 'Summer Music Festival',
      time: '2 hours ago',
      avatar: null,
    },
    {
      id: 2,
      user: 'Bob Smith',
      action: 'joined community',
      target: 'Tech Innovators',
      time: '4 hours ago',
      avatar: null,
    },
    {
      id: 3,
      user: 'Carol Williams',
      action: 'purchased tickets for',
      target: 'Basketball Championship',
      time: '6 hours ago',
      avatar: null,
    },
    {
      id: 4,
      user: 'David Brown',
      action: 'updated event',
      target: 'Art Exhibition 2024',
      time: '1 day ago',
      avatar: null,
    },
  ];

  const upcomingEvents = [
    {
      id: 1,
      name: 'Tech Conference 2024',
      date: 'Mar 15, 2024',
      attendees: 250,
      status: 'upcoming',
    },
    {
      id: 2,
      name: 'Summer Music Festival',
      date: 'Jun 20, 2024',
      attendees: 500,
      status: 'selling-fast',
    },
    {
      id: 3,
      name: 'Art Exhibition Opening',
      date: 'Apr 5, 2024',
      attendees: 100,
      status: 'upcoming',
    },
  ];

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
            Welcome back, {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}!
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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue & Tickets</CardTitle>
            <CardDescription>Monthly revenue and ticket sales overview</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height="300">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Event Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Event Categories</CardTitle>
            <CardDescription>Distribution by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height="300">
              <PieChart>
                <Pie
                  data={eventCategories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {eventCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
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
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={activity.avatar || ''} />
                      <AvatarFallback>
                        {activity.user.split(' ').map(n => n[0]).join('')}
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
                ))}
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
                {upcomingEvents.map((event) => (
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
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth">
          <Card>
            <CardHeader>
              <CardTitle>Community Growth</CardTitle>
              <CardDescription>Member growth over the last week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height="300">
                <LineChart data={communityGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="members"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
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