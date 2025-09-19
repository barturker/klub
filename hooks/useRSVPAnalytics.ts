import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface RSVPMetrics {
  totalRSVPs: number;
  goingCount: number;
  interestedCount: number;
  conversionRate: number;
  rateLimit: {
    hitCount: number;
    lastHit: string | null;
  };
  errors: {
    capacityFull: number;
    rateLimited: number;
    other: number;
  };
  lastUpdated: string;
}

interface UseRSVPAnalyticsOptions {
  eventId?: string;
  refreshInterval?: number; // ms
}

export function useRSVPAnalytics({
  eventId,
  refreshInterval = 30000 // 30 seconds default
}: UseRSVPAnalyticsOptions = {}) {
  const supabase = createClient();
  const [metrics, setMetrics] = useState<RSVPMetrics>({
    totalRSVPs: 0,
    goingCount: 0,
    interestedCount: 0,
    conversionRate: 0,
    rateLimit: {
      hitCount: 0,
      lastHit: null
    },
    errors: {
      capacityFull: 0,
      rateLimited: 0,
      other: 0
    },
    lastUpdated: new Date().toISOString()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch metrics for specific event or all events
  const fetchMetrics = async () => {
    try {
      setError(null);

      // Get RSVP counts
      let rsvpQuery = supabase
        .from('event_rsvps')
        .select('status, created_at, event_id');

      if (eventId) {
        rsvpQuery = rsvpQuery.eq('event_id', eventId);
      }

      const { data: rsvps, error: rsvpError } = await rsvpQuery;

      if (rsvpError) throw rsvpError;

      // Calculate basic metrics
      const totalRSVPs = rsvps?.length || 0;
      const goingCount = rsvps?.filter(r => r.status === 'going').length || 0;
      const interestedCount = rsvps?.filter(r => r.status === 'interested').length || 0;

      // Simple conversion rate (going / total)
      const conversionRate = totalRSVPs > 0 ? (goingCount / totalRSVPs) * 100 : 0;

      // Get rate limit data (if specific event)
      let rateLimitData = { hitCount: 0, lastHit: null };
      if (eventId) {
        const { data: rateLimits, error: rateLimitError } = await supabase
          .from('rsvp_rate_limits')
          .select('change_count, window_start')
          .eq('event_id', eventId)
          .order('window_start', { ascending: false })
          .limit(10);

        if (rateLimitError) {
          console.warn('Could not fetch rate limit data:', rateLimitError);
        } else {
          const totalHits = rateLimits?.reduce((sum, rl) => sum + rl.change_count, 0) || 0;
          const lastHit = rateLimits?.[0]?.window_start || null;
          rateLimitData = { hitCount: totalHits, lastHit };
        }
      }

      setMetrics({
        totalRSVPs,
        goingCount,
        interestedCount,
        conversionRate: Math.round(conversionRate * 100) / 100,
        rateLimit: rateLimitData,
        errors: {
          capacityFull: 0, // Would need error logging system
          rateLimited: 0,  // Would need error logging system
          other: 0         // Would need error logging system
        },
        lastUpdated: new Date().toISOString()
      });

    } catch (err) {
      console.error('Error fetching RSVP analytics:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time updates and periodic refresh
  useEffect(() => {
    // Initial fetch
    fetchMetrics();

    // Periodic refresh
    const interval = setInterval(fetchMetrics, refreshInterval);

    // Real-time subscription for RSVP changes
    let channel: any;
    if (eventId) {
      channel = supabase
        .channel(`analytics:${eventId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'event_rsvps',
          filter: `event_id=eq.${eventId}`
        }, () => {
          fetchMetrics();
        })
        .subscribe();
    } else {
      // Subscribe to all RSVP changes if no specific event
      channel = supabase
        .channel('analytics:global')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'event_rsvps'
        }, () => {
          fetchMetrics();
        })
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      channel?.unsubscribe();
    };
  }, [eventId, refreshInterval]);

  // Helper functions for alerts
  const getAlerts = () => {
    const alerts = [];

    // High error rate alert
    const totalErrors = metrics.errors.capacityFull +
                       metrics.errors.rateLimited +
                       metrics.errors.other;

    if (totalErrors > 10) {
      alerts.push({
        type: 'error' as const,
        message: `High error rate: ${totalErrors} errors detected`,
        severity: 'high' as const
      });
    }

    // Low conversion rate alert
    if (metrics.totalRSVPs > 10 && metrics.conversionRate < 30) {
      alerts.push({
        type: 'warning' as const,
        message: `Low conversion rate: ${metrics.conversionRate}%`,
        severity: 'medium' as const
      });
    }

    // Rate limiting activity
    if (metrics.rateLimit.hitCount > 50) {
      alerts.push({
        type: 'info' as const,
        message: `High rate limit activity: ${metrics.rateLimit.hitCount} hits`,
        severity: 'low' as const
      });
    }

    return alerts;
  };

  // Performance indicators
  const getPerformanceStatus = () => {
    if (isLoading) return 'loading';
    if (error) return 'error';

    const alerts = getAlerts();
    const highSeverityAlerts = alerts.filter(a => a.severity === 'high');

    if (highSeverityAlerts.length > 0) return 'critical';
    if (alerts.length > 0) return 'warning';

    return 'healthy';
  };

  return {
    metrics,
    isLoading,
    error,
    alerts: getAlerts(),
    status: getPerformanceStatus(),
    refresh: fetchMetrics
  };
}