'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Users, Calendar, Shield, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

interface CommunityInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  member_count: number;
}

export default function InvitePage({ params }: InvitePageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { token } = resolvedParams;
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [community, setCommunity] = useState<CommunityInfo | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkAuth();
  }, []);

  // Validate invitation token
  useEffect(() => {
    const validateInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/${token}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setIsValid(true);
          setCommunity(data.community);
          setExpiresAt(data.expires_at);
        } else {
          setError(data.error || 'Invalid or expired invitation');
        }
      } catch (err) {
        console.error('Error validating invitation:', err);
        setError('Failed to validate invitation');
      } finally {
        setLoading(false);
      }
    };

    validateInvitation();
  }, [token]);

  // Accept invitation
  const acceptInvitation = async () => {
    if (!user) {
      // Redirect to auth with return URL
      router.push(`/auth?next=/invite/${token}`);
      return;
    }

    setAccepting(true);
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST'
      });
      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message || 'Successfully joined the community!');
        // Redirect to community page
        setTimeout(() => {
          router.push(data.redirect_url || '/dashboard');
        }, 1000);
      } else {
        if (data.message?.includes('already a member')) {
          setAlreadyMember(true);
          setError(data.message);
        } else {
          setError(data.message || 'Failed to accept invitation');
        }
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  // Calculate time until expiration
  const getTimeUntilExpiration = () => {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !alreadyMember) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mx-auto mb-4">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-center">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="w-full">
              <Link href="/explore">Browse Communities</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadyMember && community) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mx-auto mb-4">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-center">Already a Member</CardTitle>
            <CardDescription className="text-center">
              You are already a member of {community.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="w-full">
              <Link href={`/explore/${community.slug}`}>Go to Community</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValid || !community) {
    return null;
  }

  const timeRemaining = getTimeUntilExpiration();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Cover Image */}
      {community.cover_image_url && (
        <div className="h-48 w-full overflow-hidden relative">
          <img
            src={community.cover_image_url}
            alt={`${community.name} cover`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
        </div>
      )}

      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Card className={community.cover_image_url ? '-mt-24 relative' : ''}>
          <CardHeader className="text-center pb-4">
            {/* Community Logo */}
            <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-background">
              <AvatarImage src={community.logo_url || undefined} alt={community.name} />
              <AvatarFallback className="text-2xl">
                {community.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <CardTitle className="text-2xl">
              You've been invited to join
            </CardTitle>
            <CardTitle className="text-3xl mt-2">
              {community.name}
            </CardTitle>
            {community.description && (
              <CardDescription className="mt-3 text-base max-w-md mx-auto">
                {community.description}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Community Stats */}
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{community.member_count} members</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span>Private Community</span>
              </div>
            </div>

            {/* Expiration Notice */}
            {timeRemaining && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  This invitation expires in {timeRemaining}
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {user ? (
                <Button
                  onClick={acceptInvitation}
                  disabled={accepting}
                  className="w-full"
                  size="lg"
                >
                  {accepting ? 'Joining...' : 'Accept Invitation'}
                </Button>
              ) : (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You need to sign in to accept this invitation
                    </AlertDescription>
                  </Alert>
                  <Button
                    onClick={() => router.push(`/auth?next=/invite/${token}`)}
                    className="w-full"
                    size="lg"
                  >
                    Sign In to Join
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/auth?mode=signup&next=/invite/${token}`)}
                    className="w-full"
                    size="lg"
                  >
                    Create Account & Join
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                asChild
                className="w-full"
              >
                <Link href="/explore">Browse Other Communities</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>By joining, you agree to follow the community guidelines and rules.</p>
        </div>
      </div>
    </div>
  );
}