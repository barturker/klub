'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, EyeOff, Users, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface Attendee {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  status: 'going' | 'interested';
}

interface AttendeeListProps {
  eventId: string;
  isOrganizer: boolean;
  defaultVisibility?: 'public' | 'private';
}

export function AttendeeList({
  eventId,
  isOrganizer,
  defaultVisibility = 'public'
}: AttendeeListProps) {
  const { user } = useAuth();
  const supabase = createClient();

  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isVisible, setIsVisible] = useState(defaultVisibility === 'public');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  // Fetch attendees based on privacy settings
  const fetchAttendees = async () => {
    if (!eventId) return;

    try {
      setIsLoading(true);

      // Check event privacy settings first
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('metadata')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      const metadata = eventData.metadata as any;
      const attendeeListVisible = metadata?.attendee_list_visible !== false;

      setIsVisible(attendeeListVisible);

      // Only fetch attendees if list is visible or user is organizer
      if (!attendeeListVisible && !isOrganizer) {
        setAttendees([]);
        return;
      }

      // Fetch attendees
      const query = supabase
        .from('event_rsvps')
        .select(`
          user_id,
          status,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            username
          )
        `)
        .eq('event_id', eventId)
        .in('status', ['going', 'interested'])
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const attendeeList = data?.map(rsvp => ({
        id: rsvp.user_id,
        full_name: (rsvp.profiles as any)?.full_name,
        avatar_url: (rsvp.profiles as any)?.avatar_url,
        username: (rsvp.profiles as any)?.username,
        status: rsvp.status as 'going' | 'interested'
      })) || [];

      setAttendees(attendeeList);

    } catch (error) {
      console.error('Error fetching attendees:', error);
      toast.error('Failed to load attendee list');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle attendee list visibility (organizer only)
  const toggleVisibility = async () => {
    if (!isOrganizer) return;

    setIsUpdatingVisibility(true);

    try {
      const { error } = await supabase
        .from('events')
        .update({
          metadata: {
            attendee_list_visible: !isVisible
          }
        })
        .eq('id', eventId);

      if (error) throw error;

      setIsVisible(!isVisible);
      toast.success(
        isVisible
          ? 'Attendee list is now private'
          : 'Attendee list is now public'
      );

      // Refresh attendees
      fetchAttendees();

    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update privacy settings');
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  useEffect(() => {
    fetchAttendees();
  }, [eventId, isOrganizer]);

  // Real-time updates
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`attendees:${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'event_rsvps',
        filter: `event_id=eq.${eventId}`
      }, () => {
        fetchAttendees();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [eventId]);

  const goingAttendees = attendees.filter(a => a.status === 'going');
  const interestedAttendees = attendees.filter(a => a.status === 'interested');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendees
            {!isVisible && <Lock className="h-4 w-4 text-muted-foreground" />}
          </CardTitle>

          {isOrganizer && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleVisibility}
              disabled={isUpdatingVisibility}
              className="flex items-center gap-2"
            >
              {isVisible ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Make Private
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Make Public
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!isVisible && !isOrganizer ? (
          <div className="text-center py-8 text-muted-foreground">
            <Lock className="h-8 w-8 mx-auto mb-2" />
            <p>Attendee list is private</p>
          </div>
        ) : attendees.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2" />
            <p>No RSVPs yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Going Section */}
            {goingAttendees.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="default" className="bg-green-600">
                    {goingAttendees.length} Going
                  </Badge>
                </div>
                <div className="space-y-2">
                  {goingAttendees.map((attendee) => (
                    <div key={attendee.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={attendee.avatar_url || undefined} />
                        <AvatarFallback>
                          {(attendee.full_name || attendee.username || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {attendee.full_name || attendee.username || 'Anonymous'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interested Section */}
            {interestedAttendees.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary">
                    {interestedAttendees.length} Interested
                  </Badge>
                </div>
                <div className="space-y-2">
                  {interestedAttendees.map((attendee) => (
                    <div key={attendee.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={attendee.avatar_url || undefined} />
                        <AvatarFallback>
                          {(attendee.full_name || attendee.username || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-muted-foreground">
                        {attendee.full_name || attendee.username || 'Anonymous'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}