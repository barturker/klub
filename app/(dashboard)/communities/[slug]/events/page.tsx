"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCommunityEvents } from "@/hooks/useEvents";
import { createClient } from "@/lib/supabase/client";
import EventCard from "@/components/events/EventCard";
import LazyEventCalendar from "@/components/events/LazyEventCalendar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Grid3X3, List, Plus, Search, X } from "lucide-react";
import { DateTime } from "luxon";
import { Skeleton } from "@/components/ui/skeleton";

type ViewMode = "grid" | "list" | "calendar";
type EventFilter = "all" | "upcoming" | "past" | "draft" | "published";
type EventType = "all" | "physical" | "virtual" | "hybrid";

export default function CommunityEventsPage() {
  const params = useParams();
  const router = useRouter();
  const communitySlug = params.slug as string;

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<EventFilter>("all");
  const [eventType, setEventType] = useState<EventType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [communityId, setCommunityId] = useState<string>("");

  // Fetch community by slug to get ID
  useEffect(() => {
    const fetchCommunity = async () => {
      console.log('🔍 [EventsPage] Fetching community with slug:', communitySlug);
      const supabase = createClient();

      // Check current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 [EventsPage] Current user:', user?.id, user?.email);

      const { data: community, error } = await supabase
        .from('communities')
        .select('id, name, privacy_level')
        .eq('slug', communitySlug)
        .single();

      if (error) {
        console.error('❌ [EventsPage] Error fetching community:', error);
      } else if (community) {
        console.log('✅ [EventsPage] Found community:', community);
        setCommunityId(community.id);
      } else {
        console.log('⚠️ [EventsPage] No community found for slug:', communitySlug);
      }
    };

    if (communitySlug) {
      fetchCommunity();
    }
  }, [communitySlug]);

  const queryOptions = {
    status: filter === "draft" ? "draft" : filter === "published" ? "published" : undefined,
    upcoming: filter === "upcoming",
    past: filter === "past",
  };

  console.log('🎯 [EventsPage] Using communityId:', communityId);
  console.log('🎯 [EventsPage] Query options:', queryOptions);

  const {
    data: eventsResponse,
    isLoading,
    error,
  } = useCommunityEvents(communityId, queryOptions);

  const events = eventsResponse?.events;

  // Log the response
  useEffect(() => {
    if (eventsResponse) {
      console.log('📦 [EventsPage] Events response received:', eventsResponse);
      console.log('📦 [EventsPage] Events count:', events?.length || 0);
      console.log('📦 [EventsPage] Stats:', eventsResponse.stats);
    }
    if (error) {
      console.error('❌ [EventsPage] Error loading events:', error);
    }
  }, [eventsResponse, events, error]);

  const filteredEvents = events?.filter((event: Event) => {
    // Search filter
    if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Time filter
    const now = DateTime.now();
    const startDate = DateTime.fromISO(event.start_at);
    const endDate = DateTime.fromISO(event.end_at);

    if (filter === "upcoming" && startDate <= now) return false;
    if (filter === "past" && endDate >= now) return false;

    // Tag filter
    if (selectedTags.length > 0) {
      if (!event.tags || !selectedTags.some((tag) => event.tags?.includes(tag))) {
        return false;
      }
    }

    return true;
  });

  const allTags = Array.from(
    new Set(events?.flatMap((e: Event) => e.tags || []) || [])
  ) as string[];

  const handleCreateEvent = () => {
    router.push(`/communities/${communitySlug}/events/create`);
  };


  const clearFilters = () => {
    setFilter("all");
    setEventType("all");
    setSearchQuery("");
    setSelectedTags([]);
  };

  const hasActiveFilters =
    filter !== "all" ||
    eventType !== "all" ||
    searchQuery !== "" ||
    selectedTags.length > 0;

  if (error) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <p className="text-destructive">Failed to load events</p>
          <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">
            Discover and join community events
          </p>
        </div>
        <Button onClick={handleCreateEvent}>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filter} onValueChange={(v) => setFilter(v as EventFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>

        <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Event type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="physical">In-Person</SelectItem>
            <SelectItem value="virtual">Online</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="grid">
              <Grid3X3 className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Tags:</span>
          {allTags.map((tag: string) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                setSelectedTags((prev: string[]) =>
                  prev.includes(tag)
                    ? prev.filter((t: string) => t !== tag)
                    : [...prev, tag]
                );
              }}
            >
              {tag}
            </Badge>
          ))}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6"
            >
              <X className="h-3 w-3 mr-1" />
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <>
          {filteredEvents && filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">No events found</h2>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters
                  ? "Try adjusting your filters"
                  : "Be the first to create an event!"}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button onClick={handleCreateEvent}>Create Event</Button>
              )}
            </div>
          ) : (
            <>
              {viewMode === "grid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents?.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      communitySlug={communitySlug}
                      showActions={false}
                    />
                  ))}
                </div>
              )}

              {viewMode === "list" && (
                <div className="space-y-4">
                  {filteredEvents?.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      communitySlug={communitySlug}
                      showActions={false}
                    />
                  ))}
                </div>
              )}

              {viewMode === "calendar" && filteredEvents && (
                <LazyEventCalendar
                  events={filteredEvents}
                  communitySlug={communitySlug}
                  height="700px"
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}