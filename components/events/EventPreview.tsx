"use client";

import { EventFormData } from "@/hooks/useEventStore";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DateTime } from "luxon";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Globe,
  Video,
  Edit,
  Tag,
  Repeat,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EventPreviewProps {
  eventData: Partial<EventFormData>;
  communityName: string;
  onEdit: () => void;
}

export default function EventPreview({
  eventData,
  communityName,
  onEdit,
}: EventPreviewProps) {
  const formatDateTime = (isoString: string | undefined) => {
    if (!isoString) return "Not set";
    return DateTime.fromISO(isoString).toLocaleString(
      DateTime.DATETIME_MED
    );
  };

  const getEventTypeIcon = () => {
    switch (eventData.event_type) {
      case "physical":
        return <MapPin className="h-5 w-5" />;
      case "virtual":
        return <Video className="h-5 w-5" />;
      case "hybrid":
        return <Users className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getEventTypeBadge = () => {
    switch (eventData.event_type) {
      case "physical":
        return <Badge variant="default">In-Person</Badge>;
      case "virtual":
        return <Badge variant="secondary">Online</Badge>;
      case "hybrid":
        return <Badge variant="outline">Hybrid</Badge>;
      default:
        return null;
    }
  };

  // Check for missing required fields
  const missingFields = [];
  if (!eventData.title) missingFields.push("Title");
  if (!eventData.start_at) missingFields.push("Start date/time");
  if (!eventData.end_at) missingFields.push("End date/time");
  if ((eventData.event_type === "physical" || eventData.event_type === "hybrid") && !eventData.venue_name) {
    missingFields.push("Venue name");
  }
  if ((eventData.event_type === "virtual" || eventData.event_type === "hybrid") && !eventData.online_url) {
    missingFields.push("Online URL");
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Event Preview</h2>
          <p className="text-muted-foreground">
            Review your event before publishing
          </p>
        </div>
        <Button variant="outline" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Details
        </Button>
      </div>

      {missingFields.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Missing required fields:</strong> {missingFields.join(", ")}
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden">
        {/* Cover Image */}
        {eventData.image_url && (
          <div className="w-full h-48 bg-gradient-to-br from-primary/10 to-primary/5 relative">
            <img
              src={eventData.image_url}
              alt="Event cover"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}

        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <h3 className="text-2xl font-bold">
                  {eventData.title || "Untitled Event"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Hosted by {communityName}
                </p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                {getEventTypeBadge()}
                {eventData.is_recurring && (
                  <Badge variant="outline">
                    <Repeat className="h-3 w-3 mr-1" />
                    Recurring
                  </Badge>
                )}
              </div>
            </div>

            {eventData.description && (
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {eventData.description}
                </p>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Date & Time */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date & Time
            </h4>
            <div className="pl-6 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {formatDateTime(eventData.start_at)} -{" "}
                  {formatDateTime(eventData.end_at)}
                </span>
              </div>
              {eventData.timezone && (
                <div className="text-muted-foreground">
                  Timezone: {eventData.timezone}
                </div>
              )}
              {eventData.is_recurring && eventData.recurring_rule && (
                <div className="text-muted-foreground">
                  Repeats: {eventData.recurring_rule.includes("DAILY")
                    ? "Daily"
                    : eventData.recurring_rule.includes("WEEKLY")
                    ? "Weekly"
                    : eventData.recurring_rule.includes("MONTHLY")
                    ? "Monthly"
                    : "Custom pattern"}
                  {eventData.recurring_end_date &&
                    ` until ${DateTime.fromISO(eventData.recurring_end_date).toLocaleString(DateTime.DATE_MED)}`}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              {getEventTypeIcon()}
              Location
            </h4>
            <div className="pl-6 space-y-3 text-sm">
              {(eventData.event_type === "physical" || eventData.event_type === "hybrid") && (
                <div className="space-y-1">
                  <div className="font-medium">
                    {eventData.venue_name || "Venue not specified"}
                  </div>
                  {eventData.venue_address && (
                    <div className="text-muted-foreground">
                      {eventData.venue_address}
                    </div>
                  )}
                  {(eventData.venue_city || eventData.venue_country) && (
                    <div className="text-muted-foreground">
                      {[eventData.venue_city, eventData.venue_country]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                </div>
              )}

              {(eventData.event_type === "virtual" || eventData.event_type === "hybrid") && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Online Event</span>
                  </div>
                  {eventData.online_url && (
                    <div className="text-sm text-muted-foreground break-all">
                      {eventData.online_url}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          {(eventData.capacity > 0 || (eventData.tags && eventData.tags.length > 0)) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold">Event Details</h4>
                <div className="pl-6 space-y-3 text-sm">
                  {eventData.capacity > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Capacity: {eventData.capacity} attendees</span>
                    </div>
                  )}

                  {eventData.tags && eventData.tags.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span>Tags:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {eventData.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Status Note */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This event will be created as a <strong>draft</strong>. You can
              publish it later from the event management page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}