"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Event } from "@/hooks/useEvents";
import { DateTime } from "luxon";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Repeat,
  ExternalLink,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EventCardProps {
  event: Event;
  communitySlug: string;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onPublish?: () => void;
}

export default function EventCard({
  event,
  communitySlug,
  showActions = false,
  onEdit,
  onDelete,
  onDuplicate,
  onPublish,
}: EventCardProps) {
  const startDate = DateTime.fromISO(event.start_at);
  const endDate = DateTime.fromISO(event.end_at);
  const isUpcoming = startDate > DateTime.now();
  const isOngoing = startDate <= DateTime.now() && endDate >= DateTime.now();
  const isPast = endDate < DateTime.now();

  const getStatusBadge = () => {
    if (event.status === "cancelled") {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (event.status === "draft") {
      return <Badge variant="outline">Draft</Badge>;
    }
    if (isOngoing) {
      return <Badge className="bg-green-600">Ongoing</Badge>;
    }
    if (isPast) {
      return <Badge variant="secondary">Past</Badge>;
    }
    return null;
  };

  const getEventTypeIcon = () => {
    switch (event.event_type) {
      case "physical":
        return <MapPin className="h-4 w-4" />;
      case "virtual":
        return <Video className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const formatEventTime = () => {
    const sameDay = startDate.hasSame(endDate, "day");

    if (sameDay) {
      return `${startDate.toFormat("EEE, MMM d")} • ${startDate.toFormat(
        "h:mm a"
      )} - ${endDate.toFormat("h:mm a")}`;
    }

    return `${startDate.toFormat("MMM d, h:mm a")} - ${endDate.toFormat(
      "MMM d, h:mm a"
    )}`;
  };

  const getLocationText = () => {
    if (event.event_type === "virtual") {
      return "Online Event";
    }
    if (event.venue_city) {
      return `${event.venue_name || "Venue"}, ${event.venue_city}`;
    }
    return event.venue_name || "Location TBD";
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="p-0">
        {/* Event Image or Gradient */}
        <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/10 rounded-t-lg overflow-hidden">
          {event.image_url && (
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}

          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            {getStatusBadge()}
          </div>

          {/* Actions Menu */}
          {showActions && (
            <div className="absolute top-3 right-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {event.status === "draft" && onPublish && (
                    <DropdownMenuItem onClick={onPublish}>
                      Publish Event
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      Edit Event
                    </DropdownMenuItem>
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem onClick={onDuplicate}>
                      Duplicate Event
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={onDelete}
                        className="text-destructive"
                      >
                        Delete Event
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Event Title */}
        <div>
          <Link
            href={`/communities/${communitySlug}/events/${event.slug}`}
            className="hover:underline"
          >
            <h3 className="font-semibold text-lg line-clamp-1">
              {event.title}
            </h3>
          </Link>
          {event.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>

        {/* Event Details */}
        <div className="space-y-2 text-sm">
          {/* Date/Time */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="truncate">{formatEventTime()}</span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-muted-foreground">
            {getEventTypeIcon()}
            <span className="truncate">{getLocationText()}</span>
          </div>

          {/* Capacity */}
          {event.capacity > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" />
              <span>Capacity: {event.capacity}</span>
            </div>
          )}
        </div>

        {/* Tags and Badges */}
        <div className="flex flex-wrap gap-2">
          {event.recurring_rule && (
            <Badge variant="secondary" className="text-xs">
              <Repeat className="h-3 w-3 mr-1" />
              Recurring
            </Badge>
          )}
          {event.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {event.tags && event.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{event.tags.length - 3} more
            </Badge>
          )}
        </div>

        {/* Action Button */}
        {event.status === "published" && (
          <div className="pt-2">
            <Link href={`/communities/${communitySlug}/events/${event.slug}`}>
              <Button className="w-full" size="sm">
                View Event
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}