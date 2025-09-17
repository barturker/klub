"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useEvent, useDeleteEvent } from "@/hooks/useEvents";
import EventDetails from "@/components/events/EventDetails";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const communitySlug = params.slug as string;
  const eventId = params.id as string;

  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const {
    data,
    isLoading: eventLoading,
    error: eventError,
  } = useEvent(eventId);

  const event = data?.event;

  const deleteEventMutation = useDeleteEvent();

  useEffect(() => {
    async function checkPermissions() {
      if (!event) return;

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Check if user is the event creator
          setIsOrganizer(event.created_by === user.id);

          // Check if user is a community member
          const { data: membership } = await supabase
            .from("community_members")
            .select("id")
            .eq("community_id", event.community_id)
            .eq("user_id", user.id)
            .single();

          setIsMember(!!membership);
        }
      } catch (err) {
        console.error("Error checking permissions:", err);
      } finally {
        setIsLoading(false);
      }
    }

    checkPermissions();
  }, [event]);

  const handleEdit = () => {
    router.push(`/communities/${communitySlug}/events/${eventId}/edit`);
  };

  const handleDelete = async () => {
    try {
      await deleteEventMutation.mutateAsync(eventId);
      toast.success("Event deleted successfully");
      router.push(`/communities/${communitySlug}/events`);
    } catch {
      toast.error("Failed to delete event");
    }
  };

  const handleRegister = async () => {
    // TODO: Implement event registration
    toast.info("Event registration coming soon!");
  };

  const handleCancelRegistration = async () => {
    // TODO: Implement cancel registration
    toast.info("Cancel registration coming soon!");
  };

  if (eventLoading || isLoading) {
    return (
      <div className="container py-8">
        <div className="mb-6">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-10 w-96" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <p className="text-destructive mb-4">
            {eventError?.message || "Event not found"}
          </p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/communities/${communitySlug}/events`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Link>

        {/* Admin Quick Actions */}
        {isOrganizer && (
          <div className="flex gap-2 mt-4">
            <Button onClick={handleEdit} variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Event
            </Button>
            <Button
              onClick={handleDelete}
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Event
            </Button>
          </div>
        )}
      </div>

      {/* Event Details Component */}
      <EventDetails
        event={event}
        isOrganizer={isOrganizer}
        isMember={isMember}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRegister={handleRegister}
        onCancelRegistration={handleCancelRegistration}
      />

      {/* Related Events Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Related Events</h2>
        <p className="text-muted-foreground">
          More events from this community
        </p>
        {/* TODO: Add related events carousel */}
      </div>
    </div>
  );
}