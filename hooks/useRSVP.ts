import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

type RSVPStatus = 'going' | 'interested' | 'not_going' | null;

interface UseRSVPOptions {
  eventId: string;
  eventSlug: string;
  communitySlug: string;
  capacity?: number | null;
  startAt: string;
}

export function useRSVP({
  eventId,
  eventSlug,
  communitySlug,
  capacity,
  startAt
}: UseRSVPOptions) {
  const supabase = createClient();
  const router = useRouter();
  const { user } = useAuth();

  const [status, setStatus] = useState<RSVPStatus>(null);
  const [counts, setCounts] = useState({ going: 0, interested: 0 });
  const [isLoading, setIsLoading] = useState(false); // Start with false
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if event is in the past
  const isPastEvent = new Date(startAt) < new Date();
  const canChangeRSVP = !isPastEvent;

  // Fetch current RSVP status and counts
  const fetchRSVPData = useCallback(async () => {
    console.log('[useRSVP] fetchRSVPData called', { eventId, user: user?.id });

    if (!eventId) {
      console.log('[useRSVP] No eventId, returning');
      setIsLoading(false); // Make sure to set loading to false
      return;
    }

    setIsLoading(true); // Set loading before try block

    try {

      // Fetch event with RSVP counts
      console.log('[useRSVP] Fetching event counts for:', eventId);
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('rsvp_going_count, rsvp_interested_count')
        .eq('id', eventId)
        .single();

      console.log('[useRSVP] Event data response:', { eventData, eventError });

      if (eventError) {
        console.error('[useRSVP] Error fetching event data:', eventError);
        throw eventError;
      }

      setCounts({
        going: eventData.rsvp_going_count || 0,
        interested: eventData.rsvp_interested_count || 0
      });

      // Fetch user's RSVP status if logged in
      if (user) {
        console.log('[useRSVP] Fetching user RSVP status', {
          eventId,
          userId: user.id,
          query: `event_id=${eventId}, user_id=${user.id}`
        });

        const { data: rsvpData, error: rsvpError } = await supabase
          .from('event_rsvps')
          .select('status')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .maybeSingle(); // Use maybeSingle instead of single to avoid 406 when no row exists

        console.log('[useRSVP] RSVP query response:', {
          rsvpData,
          rsvpError,
          status: rsvpData?.status
        });

        if (rsvpError) {
          console.error('[useRSVP] Error fetching RSVP status:', rsvpError);
          // Don't throw here, just log the error
        } else if (rsvpData) {
          console.log('[useRSVP] Setting user status:', rsvpData.status);
          setStatus(rsvpData.status as RSVPStatus);
        } else {
          console.log('[useRSVP] No RSVP found for user, setting status to null');
          setStatus(null);
        }
      } else {
        console.log('[useRSVP] No user logged in, skipping RSVP status fetch');
        setStatus(null);
      }
    } catch (error) {
      console.error('[useRSVP] Error in fetchRSVPData:', error);
    } finally {
      console.log('[useRSVP] Setting isLoading to false');
      setIsLoading(false);
    }
  }, [eventId, supabase, user]);

  // Handle RSVP status change
  const updateRSVP = useCallback(async (newStatus: RSVPStatus) => {
    console.log('[useRSVP] updateRSVP called', {
      newStatus,
      currentStatus: status,
      userId: user?.id,
      eventId
    });

    // Check if user is logged in
    if (!user) {
      console.log('[useRSVP] User not logged in, preserving intent and redirecting');
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
      console.log('[useRSVP] Event is in the past, cannot RSVP');
      toast.error('Cannot RSVP to past events');
      return;
    }

    // Don't update if already updating
    if (isUpdating) {
      console.log('[useRSVP] Already updating, skipping');
      toast.info('Please wait for the previous action to complete');
      return;
    }

    setIsUpdating(true);

    try {
      if (newStatus === null) {
        // Delete RSVP (cancel)
        console.log('[useRSVP] Deleting RSVP', { eventId, userId: user.id });

        const { error } = await supabase
          .from('event_rsvps')
          .delete()
          .match({ event_id: eventId, user_id: user.id });

        console.log('[useRSVP] Delete response:', { error });

        if (error) throw error;

        toast.success('RSVP cancelled');
        setStatus(null);
      } else {
        // UPSERT RSVP
        const upsertData = {
          event_id: eventId,
          user_id: user.id,
          status: newStatus,
          updated_at: new Date().toISOString()
        };

        console.log('[useRSVP] Upserting RSVP', upsertData);

        const { data, error } = await supabase
          .from('event_rsvps')
          .upsert(upsertData, {
            onConflict: 'event_id,user_id'
          })
          .select();

        console.log('[useRSVP] Upsert response:', { data, error });

        if (error) {
          console.error('[useRSVP] Upsert error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });

          // Handle specific errors
          if (error.code === '23514' && error.message.includes('capacity')) {
            // Event is full
            toast.error('Sorry, this event is now full', {
              description: 'You can still mark yourself as interested'
            });
            throw error;
          } else if (error.code === '42820') {
            // Rate limit exceeded
            toast.error('Too many changes', {
              description: 'Please wait a moment before changing your RSVP again'
            });
            throw error;
          }

          throw error;
        }

        // Show success message
        const messages = {
          going: "You're attending! We'll see you there",
          interested: "We'll keep you updated",
          not_going: "Thanks for letting us know"
        };

        toast.success(messages[newStatus]);
        setStatus(newStatus);
        console.log('[useRSVP] Status updated successfully:', newStatus);
      }

      // Refresh counts
      console.log('[useRSVP] Refreshing counts after update');
      await fetchRSVPData();
    } catch (error) {
      console.error('[useRSVP] Error updating RSVP:', error);

      // Show generic error if not already shown
      const errorMessage = error as Error;
      if (!errorMessage?.message?.includes('capacity') && !errorMessage?.message?.includes('many changes')) {
        toast.error('Failed to update RSVP', {
          description: 'Please try again'
        });
      }
    } finally {
      setIsUpdating(false);
    }
  }, [eventId, eventSlug, communitySlug, canChangeRSVP, supabase, router, user, fetchRSVPData]);

  // Initial data fetch
  useEffect(() => {
    fetchRSVPData();
  }, [fetchRSVPData]);

  // Check for RSVP intent after auth
  useEffect(() => {
    const checkRSVPIntent = async () => {
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
        } catch (error) {
          console.error('Error processing RSVP intent:', error);
          sessionStorage.removeItem('rsvp_intent');
        }
      }
    };

    checkRSVPIntent();
  }, [eventId, user, updateRSVP]);

  return {
    status,
    counts,
    isLoading,
    isUpdating,
    canChangeRSVP,
    updateRSVP,
    cancelRSVP: () => updateRSVP(null),
    isAtCapacity: capacity ? counts.going >= capacity : false,
    spotsRemaining: capacity ? Math.max(0, capacity - counts.going) : null
  };
}