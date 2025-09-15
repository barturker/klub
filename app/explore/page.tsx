import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Globe, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

async function getPublicCommunities() {
  const supabase = await createClient();

  const { data: communities, error } = await supabase
    .from('communities')
    .select('*')
    .eq('privacy_level', 'public')
    .order('member_count', { ascending: false });

  if (error) {
    console.error('Error fetching communities:', error);
    return [];
  }

  return communities || [];
}

export default async function CommunitiesPage() {
  const communities = await getPublicCommunities();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Discover Communities</h1>
        <p className="text-muted-foreground">
          Explore public communities and find your tribe
        </p>
      </div>

      {communities.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Public Communities Yet</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to create a public community!
            </p>
            <Link href="/auth">
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Community
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {communities.map((community) => (
            <Link
              key={community.id}
              href={`/explore/${community.slug}`}
              className="transition-transform hover:scale-[1.02]"
            >
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                {community.cover_image_url && (
                  <div className="h-32 w-full overflow-hidden rounded-t-lg">
                    <img
                      src={community.cover_image_url}
                      alt={`${community.name} cover`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={community.avatar_url || undefined} alt={community.name} />
                      <AvatarFallback>
                        {community.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <CardTitle className="text-lg">{community.name}</CardTitle>
                      {community.category && (
                        <Badge variant="secondary" className="mt-1">
                          {community.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <CardDescription className="line-clamp-2 mb-4">
                    {community.description || 'No description available'}
                  </CardDescription>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{community.member_count || 0} members</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      <span>Public</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}