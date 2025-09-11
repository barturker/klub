import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Settings } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = await createClient();
  
  const { data: community } = await supabase
    .from('communities')
    .select('name, description')
    .eq('slug', params.slug)
    .single();

  if (!community) {
    return {
      title: 'Community Not Found',
    };
  }

  return {
    title: `${community.name} - Klub`,
    description: community.description || `Join ${community.name} community on Klub`,
  };
}

export default async function CommunityPage({ params }: PageProps) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: community, error } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (error || !community) {
    notFound();
  }

  const isOrganizer = user?.id === community.organizer_id;

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{community.name}</CardTitle>
            </div>
            {isOrganizer && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/communities/${community.slug}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            )}
          </div>
          <CardDescription className="mt-2">
            {community.description || 'No description provided'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{community.member_count} members</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Created {new Date(community.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="mt-6 flex gap-3">
            {!isOrganizer && user && (
              <Button>Join Community</Button>
            )}
            {!user && (
              <Button asChild>
                <Link href="/auth">Sign in to Join</Link>
              </Button>
            )}
            <Button variant="outline">View Events</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}