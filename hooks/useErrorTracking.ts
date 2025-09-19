import { useState, useCallback } from 'react';

interface ErrorMetrics {
  rateLimitHits: number;
  capacityFullErrors: number;
  otherErrors: number;
  lastError: {
    type: string;
    message: string;
    timestamp: string;
  } | null;
}

export function useErrorTracking(eventId: string) {
  const [metrics, setMetrics] = useState<ErrorMetrics>({
    rateLimitHits: 0,
    capacityFullErrors: 0,
    otherErrors: 0,
    lastError: null
  });

  // Track an error and update metrics
  const trackError = useCallback(async (error: unknown, errorType: 'rate_limit' | 'capacity_full' | 'other' = 'other') => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorData = {
      type: errorType,
      message: errorMessage,
      timestamp: new Date().toISOString()
    };

    // Update local state immediately
    setMetrics(prev => ({
      ...prev,
      rateLimitHits: prev.rateLimitHits + (errorType === 'rate_limit' ? 1 : 0),
      capacityFullErrors: prev.capacityFullErrors + (errorType === 'capacity_full' ? 1 : 0),
      otherErrors: prev.otherErrors + (errorType === 'other' ? 1 : 0),
      lastError: errorData
    }));

    // Store in localStorage for persistence
    const storageKey = `error_metrics_${eventId}`;
    const stored = localStorage.getItem(storageKey);
    const existingMetrics = stored ? JSON.parse(stored) : {
      rateLimitHits: 0,
      capacityFullErrors: 0,
      otherErrors: 0,
      errors: []
    };

    const updatedMetrics = {
      rateLimitHits: existingMetrics.rateLimitHits + (errorType === 'rate_limit' ? 1 : 0),
      capacityFullErrors: existingMetrics.capacityFullErrors + (errorType === 'capacity_full' ? 1 : 0),
      otherErrors: existingMetrics.otherErrors + (errorType === 'other' ? 1 : 0),
      errors: [...(existingMetrics.errors || []), errorData].slice(-10) // Keep last 10 errors
    };

    localStorage.setItem(storageKey, JSON.stringify(updatedMetrics));

    console.log(`🚨 Error tracked: ${errorType}`, errorData);
  }, [eventId]);

  // Load metrics from storage
  const loadMetrics = useCallback(() => {
    const storageKey = `error_metrics_${eventId}`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      const data = JSON.parse(stored);
      const lastError = data.errors?.length > 0 ? data.errors[data.errors.length - 1] : null;

      setMetrics({
        rateLimitHits: data.rateLimitHits || 0,
        capacityFullErrors: data.capacityFullErrors || 0,
        otherErrors: data.otherErrors || 0,
        lastError
      });
    }
  }, [eventId]);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    const storageKey = `error_metrics_${eventId}`;
    localStorage.removeItem(storageKey);

    setMetrics({
      rateLimitHits: 0,
      capacityFullErrors: 0,
      otherErrors: 0,
      lastError: null
    });
  }, [eventId]);

  return {
    metrics,
    trackError,
    loadMetrics,
    resetMetrics
  };
}