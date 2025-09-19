import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EventFormData } from "./useEventStore";

// Types
export interface Event {
  id: string;
  community_id: string;
  created_by: string;
  title: string;
  slug: string;
  description: string;
  event_type: "physical" | "virtual" | "hybrid";
  status: "draft" | "published" | "cancelled" | "completed";
  start_at: string;
  end_at: string;
  timezone: string;
  venue_name?: string;
  venue_address?: string;
  venue_city?: string;
  venue_country?: string;
  online_url?: string;
  capacity: number;
  image_url?: string;
  recurring_rule?: string;
  recurring_end_date?: string;
  parent_event_id?: string;
  tags: string[];
  metadata: Record<string, unknown> & {
    ticket_currency?: string;
    enable_ticketing?: boolean;
    is_free?: boolean;
  };
  created_at: string;
  updated_at: string;
  rsvp_going_count?: number;
  rsvp_interested_count?: number;
  community?: {
    id: string;
    name: string;
    slug: string;
    description: string;
    image_url: string;
  };
  creator?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
  recurring_instances?: Array<{
    id: string;
    start_at: string;
    end_at: string;
    status: string;
  }>;
  next_occurrence?: {
    start_at: string;
    end_at: string;
  };
}

interface EventsResponse {
  events: Event[];
  total: number;
  stats?: {
    total: number;
    published: number;
    draft: number;
    cancelled: number;
    completed: number;
  };
  limit: number;
  offset: number;
}

// Fetch community events
export const useCommunityEvents = (
  communityId: string,
  options?: {
    status?: string;
    upcoming?: boolean;
    past?: boolean;
    limit?: number;
    offset?: number;
  }
) => {
  return useQuery<EventsResponse>({
    queryKey: ["events", "community", communityId, options],
    queryFn: async () => {
      console.log("🔄 [useCommunityEvents] Starting fetch...");
      console.log("🔄 [useCommunityEvents] Community ID:", communityId);
      console.log("🔄 [useCommunityEvents] Options:", options);

      const params = new URLSearchParams();

      if (options?.status) params.append("status", options.status);
      if (options?.upcoming !== undefined) params.append("upcoming", String(options.upcoming));
      if (options?.past !== undefined) params.append("past", String(options.past));
      if (options?.limit) params.append("limit", String(options.limit));
      if (options?.offset) params.append("offset", String(options.offset));

      const url = `/api/communities/${communityId}/events?${params.toString()}`;
      console.log("🔄 [useCommunityEvents] Fetching URL:", url);

      const response = await fetch(url);
      console.log("🔄 [useCommunityEvents] Response status:", response.status);
      console.log("🔄 [useCommunityEvents] Response OK:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [useCommunityEvents] Error response:", errorText);
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      console.log("✅ [useCommunityEvents] Data received:", data);
      console.log("✅ [useCommunityEvents] Events count:", data.events?.length || 0);
      console.log("✅ [useCommunityEvents] Stats:", data.stats);

      return data;
    },
    enabled: !!communityId,
  });
};

// Fetch single event
export const useEvent = (slug: string) => {
  return useQuery<{ event: Event }>({
    queryKey: ["event", slug],
    queryFn: async () => {
      const response = await fetch(`/api/events/${slug}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Event not found");
        }
        throw new Error("Failed to fetch event");
      }

      return response.json();
    },
    enabled: !!slug,
  });
};

// Fetch all events with filters
export const useEvents = (options?: {
  communityId?: string;
  status?: string;
  eventType?: string;
  upcoming?: boolean;
  past?: boolean;
  limit?: number;
  offset?: number;
}) => {
  return useQuery<Event[]>({
    queryKey: ["events", options],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (options?.communityId) params.append("community_id", options.communityId);
      if (options?.status) params.append("status", options.status);
      if (options?.eventType) params.append("event_type", options.eventType);
      if (options?.upcoming !== undefined) params.append("upcoming", String(options.upcoming));
      if (options?.past !== undefined) params.append("past", String(options.past));
      if (options?.limit) params.append("limit", String(options.limit));
      if (options?.offset) params.append("offset", String(options.offset));

      const response = await fetch(`/api/events?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      return data.events || [];
    },
  });
};

// Create event mutation
export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EventFormData & { community_id: string }) => {
      console.log("📤 [useCreateEvent] Sending request with data:", data);

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      console.log("📥 [useCreateEvent] Response status:", response.status);
      console.log("📥 [useCreateEvent] Response ok:", response.ok);

      if (!response.ok) {
        const error = await response.json();
        console.error("❌ [useCreateEvent] Error response:", error);
        console.error("❌ [useCreateEvent] Error details:", {
          status: response.status,
          statusText: response.statusText,
          error: error,
          details: error.details,
          issues: error.issues
        });

        // Format error message for user
        let userMessage = error.error || "Failed to create event";

        // Check for specific field errors
        if (error.details && Object.keys(error.details).length > 0) {
          const fieldErrors = Object.entries(error.details)
            .map(([field, errors]) => {
              const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              return `${fieldName}: ${Array.isArray(errors) ? errors.join(', ') : errors}`;
            })
            .join('\n');
          userMessage = `Please fix the following errors:\n${fieldErrors}`;
        }

        throw new Error(userMessage);
      }

      const result = await response.json();
      console.log("✅ [useCreateEvent] Success response:", result);
      return result;
    },
    onSuccess: (data) => {
      // Invalidate events list
      queryClient.invalidateQueries({ queryKey: ["events"] });
      console.log("[useCreateEvent] Event created:", data);
    },
  });
};

// Update event mutation
export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EventFormData> }) => {
      console.log("[useUpdateEvent] Starting update for event:", id);
      console.log("[useUpdateEvent] Data being sent:", JSON.stringify(data, null, 2));

      // Create the request body
      const requestBody = JSON.stringify(data);
      console.log("[useUpdateEvent] Request body string:", requestBody);

      const response = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: requestBody,
      });

      console.log("[useUpdateEvent] Response status:", response.status);
      console.log("[useUpdateEvent] Response ok:", response.ok);

      if (!response.ok) {
        const error = await response.json();
        console.log("[useUpdateEvent] Error response:", error);
        console.log("[useUpdateEvent] Error details:", error.details);
        throw new Error(error.error || "Failed to update event");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate specific event by both ID and slug
      queryClient.invalidateQueries({ queryKey: ["event", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["event", data.slug] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      // Also invalidate community events
      if (data.community_id) {
        queryClient.invalidateQueries({ queryKey: ["events", "community", data.community_id] });
      }
      console.log("[useUpdateEvent] Event updated:", data);
    },
  });
};

// Publish event mutation
export const usePublishEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const response = await fetch(`/api/events/${eventId}/publish`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to publish event");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      console.log("[usePublishEvent] Event published:", data);
    },
  });
};

// Delete event mutation
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slug: string) => {
      const response = await fetch(`/api/events/${slug}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete event");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      console.log("[useDeleteEvent] Event deleted");
    },
  });
};

// Duplicate event mutation
export const useDuplicateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      newDate,
    }: {
      eventId: string;
      newDate?: string;
    }) => {
      const response = await fetch(`/api/events/${eventId}/duplicate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ new_date: newDate }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to duplicate event");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      console.log("[useDuplicateEvent] Event duplicated:", data);
    },
  });
};

// Get all events (no community filter)
export const useAllEvents = (options?: {
  status?: string;
  limit?: number;
  offset?: number;
}) => {
  return useQuery<EventsResponse>({
    queryKey: ["events", "all", options],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (options?.status) params.append("status", options.status);
      if (options?.limit) params.append("limit", String(options.limit));
      if (options?.offset) params.append("offset", String(options.offset));

      const response = await fetch(`/api/events?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      return response.json();
    },
  });
};

// Search events
export const useSearchEvents = (searchTerm: string, communityId?: string) => {
  return useQuery<Event[]>({
    queryKey: ["events", "search", searchTerm, communityId],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: searchTerm,
        status: "published",
      });

      if (communityId) {
        params.append("community_id", communityId);
      }

      const response = await fetch(`/api/events?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to search events");
      }

      const data = await response.json();
      return data.events;
    },
    enabled: searchTerm.length > 2,
  });
};

// Get upcoming events for user
export const useUpcomingEvents = (limit = 5) => {
  return useQuery<Event[]>({
    queryKey: ["events", "upcoming", limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: "published",
        upcoming: "true",
        limit: String(limit),
      });

      const response = await fetch(`/api/events?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch upcoming events");
      }

      const data = await response.json();
      return data.events;
    },
  });
};

// Hook to prefetch event data
export const usePrefetchEvent = () => {
  const queryClient = useQueryClient();

  return (slug: string) => {
    queryClient.prefetchQuery({
      queryKey: ["event", slug],
      queryFn: async () => {
        const response = await fetch(`/api/events/${slug}`);

        if (!response.ok) {
          throw new Error("Failed to fetch event");
        }

        return response.json();
      },
    });
  };
};