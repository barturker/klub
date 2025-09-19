import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useErrorTracking } from '@/hooks/useErrorTracking';

type RSVPStatus = 'going' | 'interested' | 'not_going' | null;

interface UseRSVPOptions {
  eventId: string;
  eventSlug: string;
  communitySlug: string;
  capacity?: number | null;
  startAt: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useRSVP({
  eventId,
  eventSlug,
  communitySlug,
  capacity,
  startAt,
  onSuccess,
  onError
}: UseRSVPOptions) {
  const supabase = createClient();
  const router = useRouter();
  const { user } = useAuth();
  const { trackError } = useErrorTracking(eventId);

  const [status, setStatus] = useState<RSVPStatus>(null);
  const [counts, setCounts] = useState({ going: 0, interested: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // For optimistic updates rollback
  const previousStatus = useRef<RSVPStatus>(null);
  const previousCounts = useRef({ going: 0, interested: 0 });
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Check if event is in the past
  const isPastEvent = new Date(startAt) < new Date();
  const canChangeRSVP = !isPastEvent;

  // Fetch current RSVP status and counts
  const fetchRSVPData = useCallback(async () => {
    if (!eventId) return;

    setIsLoading(true);
    try {
      // Fetch event with RSVP counts
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('rsvp_going_count, rsvp_interested_count')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      const newCounts = {
        going: eventData.rsvp_going_count || 0,
        interested: eventData.rsvp_interested_count || 0
      };

      setCounts(newCounts);
      previousCounts.current = newCounts;

      // Fetch user's RSVP status if logged in
      if (user) {
        const { data: rsvpData, error: rsvpError } = await supabase
          .from('event_rsvps')
          .select('status')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (rsvpError) {
          console.error('Error fetching RSVP status:', rsvpError);
        } else {
          const userStatus = rsvpData?.status as RSVPStatus || null;
          setStatus(userStatus);
          previousStatus.current = userStatus;
        }
      } else {
        setStatus(null);
        previousStatus.current = null;
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching RSVP data:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId, supabase, user]);

  // Handle RSVP status change with optimistic updates
  const updateRSVP = useCallback(async (newStatus: RSVPStatus) => {
    // Check if user is logged in
    if (!user) {
      // Preserve RSVP intent in sessionStorage
      sessionStorage.setItem('rsvp_intent', JSON.stringify({
        eventId,
        eventSlug,
        communitySlug,
        status: newStatus,
        timestamp: Date.now()
      }));

      // Redirect to auth with return URL
      const returnUrl = `/communities/${communitySlug}/events/${eventSlug}`;
      router.push(`/auth/login?redirectTo=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // Check if event is in the past
    if (!canChangeRSVP) {
      toast.error('Cannot RSVP to past events');
      return;
    }

    // Don't update if already updating
    if (isUpdating) {
      toast.info('Please wait for the previous action to complete');
      return;
    }

    setIsUpdating(true);
    setError(null);

    // Store previous state for rollback
    const oldStatus = status;
    const oldCounts = { ...counts };
    previousStatus.current = status;
    previousCounts.current = counts;

    // Optimistic update
    const newCounts = { ...counts };

    // Update counts optimistically
    if (status === 'going') newCounts.going--;
    if (status === 'interested') newCounts.interested--;
    if (newStatus === 'going') newCounts.going++;
    if (newStatus === 'interested') newCounts.interested++;

    setStatus(newStatus);
    setCounts(newCounts);

    try {
      if (newStatus === null) {
        // Delete RSVP (cancel)
        const { error } = await supabase
          .from('event_rsvps')
          .delete()
          .match({ event_id: eventId, user_id: user.id });

        if (error) throw error;

        toast.success('RSVP cancelled');
      } else {
        // UPSERT RSVP
        const { error } = await supabase
          .from('event_rsvps')
          .upsert({
            event_id: eventId,
            user_id: user.id,
            status: newStatus,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'event_id,user_id'
          });

        if (error) {
          // Handle specific errors with proper flags to prevent duplicate toasts
          let errorHandled = false;

          if (error.code === '23514' && error.message.includes('capacity')) {
            // Event is full
            await trackError(error, 'capacity_full');
            toast.error('Sorry, this event is now full', {
              description: 'You can join the waitlist instead',
              action: {
                label: 'Join Waitlist',
                onClick: () => {
                  // Automatically switch to interested
                  updateRSVP('interested');
                }
              }
            });
            errorHandled = true;
          } else if (error.code === '42820') {
            // Rate limit exceeded - show user-friendly message
            await trackError(error, 'rate_limit');
            toast.error('Too many changes', {
              description: 'Please wait a moment before changing your RSVP again'
            });
            errorHandled = true;
          } else if (error.code === '55P03') {
            // Lock not available, retry silently
            if (retryCount.current < maxRetries) {
              retryCount.current++;
              setTimeout(() => updateRSVP(newStatus), 100 * retryCount.current);
              return;
            }
            // If max retries reached, show error
            toast.error('System busy', {
              description: 'Please try again in a moment'
            });
            errorHandled = true;
          }

          // Create a clean error object for logging
          const cleanError = {
            ...error,
            handled: errorHandled
          };
          throw cleanError;
        }

        // Show success message
        const messages = {
          going: "You're attending! We'll see you there",
          interested: "We'll keep you updated",
          not_going: "Thanks for letting us know"
        };

        toast.success(messages[newStatus]);
      }

      // Reset retry count on success
      retryCount.current = 0;
      onSuccess?.();

    } catch (err) {
      // Rollback optimistic update
      setStatus(oldStatus);
      setCounts(oldCounts);

      const error = err as Error & { handled?: boolean };

      // Only log unexpected errors to console
      if (!error.handled) {
        console.error('Error updating RSVP:', error);
        // Track unhandled errors
        trackError(error, 'other');
      }

      setError(error);

      // Show generic error only if not already handled
      if (!error.handled) {
        toast.error('Failed to update RSVP', {
          description: 'Please try again'
        });
      }

      onError?.(error);
    } finally {
      setIsUpdating(false);
    }
  }, [user, eventId, eventSlug, communitySlug, status, counts, canChangeRSVP, isUpdating, supabase, router, onSuccess, onError, trackError]);

  // Set up real-time subscriptions, periodic refresh, and focus refresh
  useEffect(() => {
    if (!eventId) return;

    // Initial fetch
    setIsLoading(true);
    fetchRSVPData().finally(() => setIsLoading(false));

    // Subscribe to RSVP changes for this event (real-time updates)
    const eventChannel = supabase
      .channel(`event:${eventId}:rsvps`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'event_rsvps',
        filter: `event_id=eq.${eventId}`
      }, () => {
        // Refresh data when any RSVP changes
        fetchRSVPData();
      })
      .subscribe();

    // Subscribe to user's own RSVP changes (multi-device sync)
    let userChannel: ReturnType<typeof supabase.channel> | undefined;
    if (user) {
      userChannel = supabase
        .channel(`user:${user.id}:rsvps`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'event_rsvps',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          const newRecord = payload.new as { event_id: string; status: RSVPStatus } | null;
          const oldRecord = payload.old as { event_id: string } | null;

          if (newRecord && newRecord.event_id === eventId) {
            const newStatus = newRecord.status;
            setStatus(newStatus);
            previousStatus.current = newStatus;
          } else if (oldRecord && oldRecord.event_id === eventId) {
            setStatus(null);
            previousStatus.current = null;
          }
        })
        .subscribe();
    }

    // Subscribe to event count updates (for materialized counts)
    const countsChannel = supabase
      .channel(`event:${eventId}:counts`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'events',
        filter: `id=eq.${eventId}`
      }, (payload) => {
        const newRecord = payload.new as { rsvp_going_count?: number; rsvp_interested_count?: number } | null;
        if (newRecord) {
          const newCounts = {
            going: newRecord.rsvp_going_count || 0,
            interested: newRecord.rsvp_interested_count || 0
          };
          setCounts(newCounts);
          previousCounts.current = newCounts;
        }
      })
      .subscribe();

    // Periodic refresh to handle stale data (30 seconds)
    const refreshInterval = setInterval(() => {
      fetchRSVPData();
    }, 30000); // 30 seconds

    // Refresh on window focus
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchRSVPData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // Cleanup
    return () => {
      eventChannel.unsubscribe();
      userChannel?.unsubscribe();
      countsChannel.unsubscribe();
      clearInterval(refreshInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [eventId, user, supabase, fetchRSVPData]);

  // Check for RSVP intent after auth
  useEffect(() => {
    if (!user) return;

    const intentStr = sessionStorage.getItem('rsvp_intent');
    if (intentStr) {
      try {
        const intent = JSON.parse(intentStr);

        // Check if this is the right event and not too old (5 minutes)
        if (intent.eventId === eventId &&
            Date.now() - intent.timestamp < 5 * 60 * 1000) {

          // Execute the intended RSVP
          updateRSVP(intent.status);

          // Clear the intent
          sessionStorage.removeItem('rsvp_intent');
        }
      } catch (err) {
        console.error('Error processing RSVP intent:', err);
        sessionStorage.removeItem('rsvp_intent');
      }
    }
  }, [user, eventId, updateRSVP]);

  return {
    status,
    counts,
    isLoading,
    isUpdating,
    error,
    canChangeRSVP,
    updateRSVP,
    cancelRSVP: () => updateRSVP(null),
    isAtCapacity: capacity ? counts.going >= capacity : false,
    spotsRemaining: capacity ? Math.max(0, capacity - counts.going) : null
  };
}