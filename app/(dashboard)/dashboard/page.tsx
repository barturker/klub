import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Ticket, Settings } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth');
  }

  // Fetch user's communities
  const { data: communities, count: communitiesCount } = await supabase
    .from('communities')
    .select('*', { count: 'exact', head: false })
    .eq('organizer_id', user.id);

  // Fetch user's membership in communities
  const { data: memberships, count: membershipsCount } = await supabase
    .from('community_members')
    .select('*', { count: 'exact', head: false })
    .eq('user_id', user.id);

  // Fetch user's upcoming events (through their communities)
  const { data: events, count: eventsCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: false })
    .in('community_id', (communities || []).map(c => c.id))
    .gte('start_at', new Date().toISOString())
    .eq('status', 'published');

  // Fetch user's tickets
  const { data: tickets, count: ticketsCount } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: false })
    .eq('user_id', user.id)
    .eq('status', 'confirmed');

  const totalCommunities = (communitiesCount || 0) + (membershipsCount || 0);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome to Klub!</h1>
        <p className="text-muted-foreground">
          Logged in as: {user.email}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Communities
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCommunities}</div>
            <p className="text-xs text-muted-foreground">
              {totalCommunities === 0 
                ? "Create your first community"
                : `${communitiesCount || 0} owned, ${membershipsCount || 0} joined`}
            </p>
            <Button className="mt-4 w-full" asChild>
              <Link href="/communities/new">Create Community</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Events
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {eventsCount === 0 ? "No upcoming events" : "Upcoming events"}
            </p>
            <Button className="mt-4 w-full" variant="outline" asChild>
              <Link href="/events">Browse Events</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tickets
            </CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ticketsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {ticketsCount === 0 ? "No active tickets" : "Active tickets"}
            </p>
            <Button className="mt-4 w-full" variant="outline" asChild>
              <Link href="/tickets">My Tickets</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Settings
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Manage your account
            </p>
            <Button className="mt-4 w-full" variant="outline" asChild>
              <Link href="/profile">Edit Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-2xl font-semibold">Getting Started</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Create a Community</CardTitle>
              <CardDescription>
                Start building your community by creating your first group
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/communities/new">Get Started</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Join Communities</CardTitle>
              <CardDescription>
                Discover and join communities that match your interests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link href="/communities">Browse Communities</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}