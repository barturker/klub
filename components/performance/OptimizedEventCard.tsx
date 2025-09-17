"use client";

import { memo } from "react";
import EventCard from "@/components/events/EventCard";
import { Event } from "@/hooks/useEvents";

interface OptimizedEventCardProps {
  event: Event;
  communitySlug: string;
  showActions?: boolean;
  onEdit?: (event: Event) => void;
  onDelete?: (event: Event) => void;
}

// Memoize EventCard to prevent unnecessary re-renders
const OptimizedEventCard = memo(
  EventCard,
  (prevProps, nextProps) => {
    // Only re-render if these specific props change
    return (
      prevProps.event.id === nextProps.event.id &&
      prevProps.event.title === nextProps.event.title &&
      prevProps.event.status === nextProps.event.status &&
      prevProps.event.start_at === nextProps.event.start_at &&
      prevProps.event.end_at === nextProps.event.end_at &&
      prevProps.communitySlug === nextProps.communitySlug &&
      prevProps.showActions === nextProps.showActions
    );
  }
);

OptimizedEventCard.displayName = "OptimizedEventCard";

export default OptimizedEventCard;