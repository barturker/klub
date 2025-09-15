'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Community {
  id: string;
  name: string;
  slug: string;
}

interface Profile {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  location?: string | null;
  interests?: string[] | null;
  privacy_level?: string | null;
  member_since?: string | null;
  last_active?: string | null;
}

interface ProfileViewData {
  profile: Profile;
  is_following: boolean;
  shared_communities: Community[];
}

export default function PublicProfilePage() {
  const params = useParams();
  const profileId = params.id as string;
  const [profileData, setProfileData] = useState<ProfileViewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/profile/${profileId}`);

        if (!response.ok) {
          if (response.status === 404) {
            toast.error('Profile not found');
            return;
          }
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        setProfileData(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    if (profileId) {
      fetchProfile();
    }
  }, [profileId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Profile not found</h2>
          <p className="text-muted-foreground mt-2">
            This profile doesn&apos;t exist or is not accessible.
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const { profile, shared_communities } = profileData;

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <ProfileCard profile={profile} showFullDetails />

          {profile.privacy_level === 'private' && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                This profile is private. Only basic information is visible.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {shared_communities.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Shared Communities</h3>
              <div className="space-y-2">
                {shared_communities.map((community) => (
                  <Link
                    key={community.id}
                    href={`/c/${community.slug}`}
                    className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="font-medium">{community.name}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {profile.interests && profile.interests.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest: string) => (
                  <Badge key={interest} variant="secondary">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}