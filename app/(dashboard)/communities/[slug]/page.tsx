import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Settings } from 'lucide-react';
import Link from 'next/link';
import { InvitationSection } from '@/components/invitations/InvitationSection';
import { FixAdminAccess } from '@/components/community/FixAdminAccess';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = await createClient();
  const { slug } = await params;
  
  const { data: community } = await supabase
    .from('communities')
    .select('name, description')
    .eq('slug', slug)
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
  const { slug } = await params;
  
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: community, error } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !community) {
    notFound();
  }

  const isOrganizer = user?.id === community.organizer_id;

  // Get user's role in the community if they are a member
  let memberRole = null;
  let isAdmin = false;
  let isModerator = false;

  if (user) {
    const { data: memberData } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .single();

    if (memberData) {
      memberRole = memberData.role;
      isAdmin = memberRole === 'admin' || isOrganizer;
      isModerator = memberRole === 'moderator';
    } else if (isOrganizer) {
      // If user is organizer but not in community_members table, still give admin access
      isAdmin = true;
    }
  }

  return (
    <div className="container py-8 space-y-6">
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
            {!memberRole && user && (
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


      {/* Show fix button if user is organizer but not admin */}
      {isOrganizer && !memberRole && user && (
        <FixAdminAccess communityId={community.id} userId={user.id} />
      )}

      {/* Invitation Section - Only visible to admins and moderators */}
      {(isAdmin || isModerator) && (
        <InvitationSection
          communityId={community.id}
          isAdmin={isAdmin}
          isModerator={isModerator}
        />
      )}
    </div>
  );
}