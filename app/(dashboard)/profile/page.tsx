'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { ProfileCompletionBar } from '@/components/profile/ProfileCompletionBar';
import { toast } from 'sonner';

interface ProfileData {
  profile: {
    id?: string;
    display_name?: string;
    full_name?: string;
    bio?: string;
    location?: string;
    website?: string;
    interests?: string[];
    privacy_level?: 'public' | 'members_only' | 'private';
    social_links?: Record<string, string>;
    avatar_url?: string | null;
  };
  completion_percentage: number;
  missing_fields?: string[];
}

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/profile');

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Please sign in to view your profile');
          router.push('/auth');
          return;
        }
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();

      // Also fetch completion details
      const completionResponse = await fetch('/api/profile/complete', {
        method: 'POST',
      });

      if (completionResponse.ok) {
        const completionData = await completionResponse.json();
        setProfileData({
          ...data,
          missing_fields: completionData.missing_fields,
        });
      } else {
        setProfileData(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

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
            There was an error loading your profile. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your profile information and privacy settings
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <ProfileForm
            initialData={profileData.profile}
            onSuccess={() => fetchProfile()}
          />
        </div>

        <div className="space-y-6">
          <ProfileCompletionBar
            percentage={profileData.completion_percentage}
            missingFields={profileData.missing_fields}
            className="sticky top-4"
          />
        </div>
      </div>
    </div>
  );
}