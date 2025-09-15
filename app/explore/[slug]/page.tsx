import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Calendar,
  MapPin,
  Globe,
  UserPlus,
  CalendarDays,
  Info,
  Star
} from 'lucide-react';
import Link from 'next/link';

interface CommunityPageProps {
  params: {
    slug: string;
  };
}

async function getCommunity(slug: string) {
  const supabase = await createClient();

  const { data: community, error } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .eq('privacy_level', 'public')
    .single();

  if (error || !community) {
    return null;
  }

  return community;
}

async function getCommunityEvents(communityId: string) {
  const supabase = await createClient();

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('community_id', communityId)
    .eq('status', 'published')
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(6);

  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }

  return events || [];
}

export default async function CommunityDetailPage({ params }: CommunityPageProps) {
  const community = await getCommunity(params.slug);

  if (!community) {
    notFound();
  }

  const events = await getCommunityEvents(community.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Cover Image */}
      {community.cover_image_url && (
        <div className="h-64 w-full overflow-hidden">
          <img
            src={community.cover_image_url}
            alt={`${community.name} cover`}
            className="h-full w-full object-cover"
            style={community.theme_color ? {
              filter: `hue-rotate(${community.theme_color === '#3B82F6' ? 0 : 30}deg)`
            } : undefined}
          />
        </div>
      )}

      {/* Community Header */}
      <div className="container mx-auto px-4">
        <div className="relative -mt-16 mb-8">
          <Card className="border-2">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Avatar className="h-24 w-24 border-4 border-background">
                  <AvatarImage src={community.avatar_url || undefined} alt={community.name} />
                  <AvatarFallback className="text-2xl">
                    {community.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">{community.name}</h1>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {community.category && (
                          <Badge variant="secondary">{community.category}</Badge>
                        )}
                        <Badge variant="outline">
                          <Globe className="mr-1 h-3 w-3" />
                          Public Community
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{community.member_count || 0} members</span>
                        </div>
                      </div>
                      <p className="text-muted-foreground">
                        {community.description || 'Welcome to our community!'}
                      </p>
                    </div>

                    <Link href="/auth">
                      <Button size="lg">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Join Community
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="about" className="mb-8">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    About This Community
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {community.settings?.long_description ||
                     community.description ||
                     'This community is a place for like-minded individuals to connect, share ideas, and grow together.'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Community Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Members</span>
                    <span className="font-semibold">{community.member_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Events Hosted</span>
                    <span className="font-semibold">{events.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-semibold">
                      {new Date(community.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {community.settings?.location && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {community.settings.location}
                    </p>
                  </CardContent>
                </Card>
              )}

              {community.settings?.website && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Website
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <a
                      href={community.settings.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {community.settings.website}
                    </a>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="events" className="mt-6">
            {events.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Upcoming Events</h3>
                  <p className="text-muted-foreground">
                    This community hasn&apos;t scheduled any events yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                  <Card key={event.id} className="hover:shadow-lg transition-shadow">
                    {event.cover_image_url && (
                      <div className="h-32 w-full overflow-hidden rounded-t-lg">
                        <img
                          src={event.cover_image_url}
                          alt={event.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <CardDescription>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(event.start_at).toLocaleDateString()}
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <Card className="text-center py-12">
              <CardContent>
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Members Directory</h3>
                <p className="text-muted-foreground mb-4">
                  Join this community to see and connect with other members.
                </p>
                <Link href="/auth">
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Join to View Members
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}