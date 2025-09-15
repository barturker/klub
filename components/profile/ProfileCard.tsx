'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Calendar, Globe, Lock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ProfileCardProps {
  profile: {
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
  };
  showFullDetails?: boolean;
  className?: string;
}

export function ProfileCard({ profile, showFullDetails = false, className }: ProfileCardProps) {
  const displayName = profile.display_name || profile.full_name || 'Anonymous User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const privacyIcon = {
    public: <Globe className="w-3 h-3" />,
    members_only: <Users className="w-3 h-3" />,
    private: <Lock className="w-3 h-3" />,
  };

  const privacyLabel = {
    public: 'Public',
    members_only: 'Members Only',
    private: 'Private',
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{displayName}</h3>
            {profile.privacy_level && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                {privacyIcon[profile.privacy_level as keyof typeof privacyIcon]}
                {privacyLabel[profile.privacy_level as keyof typeof privacyLabel]}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {profile.bio && (
          <p className="text-sm text-muted-foreground line-clamp-3">{profile.bio}</p>
        )}

        <div className="space-y-2">
          {profile.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{profile.location}</span>
            </div>
          )}

          {profile.member_since && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                Member since{' '}
                {formatDistanceToNow(new Date(profile.member_since), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>

        {profile.interests && profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {profile.interests.slice(0, showFullDetails ? undefined : 5).map((interest) => (
              <Badge key={interest} variant="secondary" className="text-xs">
                {interest}
              </Badge>
            ))}
            {!showFullDetails && profile.interests.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{profile.interests.length - 5} more
              </Badge>
            )}
          </div>
        )}

        {showFullDetails && (
          <Link
            href={`/profile/${profile.id}`}
            className="inline-flex items-center text-sm text-primary hover:underline"
          >
            View full profile →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}