"use client";

import { useState } from "react";
import { Event } from "@/hooks/useEvents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DateTime } from "luxon";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Globe,
  Share2,
  Heart,
  Bookmark,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  AlertCircle,
  Repeat,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TicketTierDisplay } from "@/components/tickets/TicketTierDisplay";
import { RSVPButton } from "@/components/events/RSVPButton";
import { AttendeeList } from "@/components/events/AttendeeList";
import { RSVPAnalyticsDashboard } from "@/components/events/RSVPAnalyticsDashboard";

interface EventDetailsProps {
  event: Event;
  isOrganizer?: boolean;
  isMember?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onRegister?: () => void;
  onCancelRegistration?: () => void;
}

export default function EventDetails({
  event,
  isOrganizer = false,
  isMember = false,
  onEdit,
  onDelete,
  onRegister,
  onCancelRegistration,
}: EventDetailsProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  const startDate = DateTime.fromISO(event.start_at);
  const endDate = DateTime.fromISO(event.end_at);
  const isUpcoming = startDate > DateTime.now();
  const isOngoing = startDate <= DateTime.now() && endDate >= DateTime.now();
  const isPast = endDate < DateTime.now();

  const formatFullDateTime = (dt: DateTime) => {
    return dt.toLocaleString(DateTime.DATETIME_FULL);
  };

  const getEventTypeLabel = () => {
    switch (event.event_type) {
      case "physical":
        return "In-Person Event";
      case "virtual":
        return "Online Event";
      case "hybrid":
        return "Hybrid Event";
      default:
        return "Event";
    }
  };

  const copyEventLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Event link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSave = () => {
    setIsSaved(!isSaved);
    toast.success(isSaved ? "Event removed from saved" : "Event saved");
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
  };

  return (
    <div className="space-y-6">
      {/* Header Image */}
      {event.image_url && (
        <div className="relative w-full h-64 md:h-96 rounded-xl overflow-hidden">
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Overlay Info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              {event.status === "cancelled" && (
                <Badge variant="destructive">Cancelled</Badge>
              )}
              {event.status === "draft" && (
                <Badge variant="secondary">Draft</Badge>
              )}
              {isOngoing && (
                <Badge className="bg-green-600">Happening Now</Badge>
              )}
              <Badge variant="secondary">{getEventTypeLabel()}</Badge>
              {event.recurring_rule && (
                <Badge variant="secondary">
                  <Repeat className="h-3 w-3 mr-1" />
                  Recurring
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {event.title}
            </h1>
            <p className="text-lg opacity-90">
              Hosted by {event.community?.name}
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Event Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* No image header */}
          {!event.image_url && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                {event.status === "cancelled" && (
                  <Badge variant="destructive">Cancelled</Badge>
                )}
                {event.status === "draft" && (
                  <Badge variant="secondary">Draft</Badge>
                )}
                {isOngoing && (
                  <Badge className="bg-green-600">Happening Now</Badge>
                )}
                <Badge variant="secondary">{getEventTypeLabel()}</Badge>
              </div>
              <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
              <p className="text-muted-foreground">
                Hosted by {event.community?.name}
              </p>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-3">About this Event</h2>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {event.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Organizer */}
          {event.creator && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-3">Organizer</h3>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={event.creator.avatar_url} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {event.creator.full_name || event.creator.username || "Organizer"}
                    </p>
                    <p className="text-sm text-muted-foreground">Event Organizer</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-4">
          {/* Debug Info - Remove after testing */}

          {/* Ticket/Free Event Info - Show RSVP if it's a free event */}
          {(event.metadata?.is_free === true ||
            event.metadata?.enable_ticketing === false ||
            (event.metadata && Object.keys(event.metadata).includes('attendee_list_visible'))) ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Free Event
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RSVPButton
                  eventId={event.id}
                  eventSlug={event.slug}
                  communitySlug={event.community?.slug || ""}
                  capacity={event.capacity}
                  startAt={event.start_at}
                />
                {event.capacity && event.capacity > 0 && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5" />
                      This event has limited capacity. RSVP early to secure your spot!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <TicketTierDisplay
              eventId={event.id}
              eventStatus={event.status}
              eventStartDate={event.start_at}
              eventCurrency={event.metadata?.ticket_currency as any || "USD"}
              canPurchase={isMember}
            />
          )}

          {/* Action Card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Date & Time */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="font-medium">Date & Time</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFullDateTime(startDate)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      to {formatFullDateTime(endDate)}
                    </p>
                    {event.timezone && (
                      <p className="text-xs text-muted-foreground">
                        Timezone: {event.timezone}
                      </p>
                    )}
                  </div>
                </div>

                {event.recurring_rule && (
                  <div className="flex items-start gap-3">
                    <Repeat className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="font-medium">Recurring Event</p>
                      <p className="text-sm text-muted-foreground">
                        This event repeats regularly
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Location */}
              <div className="space-y-3">
                {(event.event_type === "physical" || event.event_type === "hybrid") && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {event.venue_name}
                      </p>
                      {event.venue_address && (
                        <p className="text-sm text-muted-foreground">
                          {event.venue_address}
                        </p>
                      )}
                      {(event.venue_city || event.venue_country) && (
                        <p className="text-sm text-muted-foreground">
                          {[event.venue_city, event.venue_country]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {(event.event_type === "virtual" || event.event_type === "hybrid") && (
                  <div className="flex items-start gap-3">
                    <Video className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="font-medium">Online Access</p>
                      {event.online_url && (
                        <a
                          href={event.online_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline break-all"
                        >
                          Join Online
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {event.capacity > 0 && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="font-medium">Capacity</p>
                      <p className="text-sm text-muted-foreground">
                        {event.capacity} attendees max
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {event.status === "published" && isUpcoming && isMember && (
                  <Button className="w-full" size="lg" onClick={onRegister}>
                    Register for Event
                  </Button>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleLike}
                    className="flex-1"
                  >
                    <Heart
                      className={`h-4 w-4 ${isLiked ? "fill-current text-red-500" : ""}`}
                    />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSave}
                    className="flex-1"
                  >
                    <Bookmark
                      className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`}
                    />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyEventLink}
                    className="flex-1"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {isOrganizer && (
                  <>
                    <Separator className="my-2" />
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onEdit}
                        className="w-full"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Event
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Event
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. The event will be permanently deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={onDelete}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* RSVP Analytics Dashboard - Only for Free Events and Organizers */}
          {(event.metadata?.is_free === true ||
            event.metadata?.enable_ticketing === false ||
            (event.metadata && Object.keys(event.metadata).includes('attendee_list_visible'))) && (
            <RSVPAnalyticsDashboard
              eventId={event.id}
              isOrganizer={isOrganizer}
            />
          )}

          {/* Attendee List - Only for Free Events */}
          {(event.metadata?.is_free === true ||
            event.metadata?.enable_ticketing === false ||
            (event.metadata && Object.keys(event.metadata).includes('attendee_list_visible'))) && (
            <AttendeeList
              eventId={event.id}
              isOrganizer={isOrganizer || false}
              defaultVisibility="public"
            />
          )}

          {/* Status Alerts */}
          {event.status === "cancelled" && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Event Cancelled</p>
                    <p className="text-sm text-muted-foreground">
                      This event has been cancelled by the organizer.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}