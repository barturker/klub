"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import EventCreateWizard from "@/components/events/EventCreateWizard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useEvent, Event } from "@/hooks/useEvents";
import { toast } from "sonner";

interface Community {
  id: string;
  name: string;
  slug: string;
}

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const communitySlug = params.slug as string;
  const eventSlug = params.eventSlug as string;

  const [community, setCommunity] = useState<Community | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Fetch event data using the existing hook
  const { data: eventData, isLoading: eventLoading, error: eventError } = useEvent(eventSlug);
  const event = eventData?.event;

  // Check authorization and fetch community
  useEffect(() => {
    async function checkAuthAndFetchCommunity() {
      if (!event) return;

      try {
        const supabase = createClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          toast.error("You must be logged in to edit events");
          router.push(`/communities/${communitySlug}/events/${eventSlug}`);
          return;
        }

        // Check if user is the event creator or community admin
        const isEventCreator = event.created_by === user.id;

        // Check if user is community admin
        const { data: membership } = await supabase
          .from("community_members")
          .select("role")
          .eq("community_id", event.community_id)
          .eq("user_id", user.id)
          .single();

        const isAdmin = membership?.role === "admin" || membership?.role === "owner";

        if (!isEventCreator && !isAdmin) {
          toast.error("You don't have permission to edit this event");
          router.push(`/communities/${communitySlug}/events/${eventSlug}`);
          return;
        }

        setIsAuthorized(true);

        // Fetch community data
        const { data: communityData, error: communityError } = await supabase
          .from("communities")
          .select("id, name, slug")
          .eq("id", event.community_id)
          .single();

        if (communityError) throw communityError;

        setCommunity(communityData);
      } catch (err) {
        console.error("Error checking authorization:", err);
        toast.error("Failed to verify permissions");
        router.push(`/communities/${communitySlug}/events/${eventSlug}`);
      } finally {
        setAuthLoading(false);
      }
    }

    checkAuthAndFetchCommunity();
  }, [event, communitySlug, eventSlug, router]);

  // Handle loading states
  if (eventLoading || authLoading) {
    return (
      <div className="container py-8">
        <div className="mb-6">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // Handle errors
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

  // Check authorization
  if (!isAuthorized || !community) {
    return null; // Will redirect in useEffect
  }

  // Handle successful update
  const handleSuccess = (updatedEventSlug: string) => {
    toast.success("Event updated successfully!");
    router.push(`/communities/${communitySlug}/events/${updatedEventSlug}`);
  };

  // Handle cancel
  const handleCancel = () => {
    router.push(`/communities/${communitySlug}/events/${eventSlug}`);
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/communities/${communitySlug}/events/${eventSlug}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Event
        </Link>

        <h1 className="text-3xl font-bold">Edit Event</h1>
        <p className="text-muted-foreground">
          Update event details for {event.title}
        </p>
      </div>

      {/* Event Wizard in Edit Mode */}
      <EventCreateWizard
        communityId={community.id}
        communityName={community.name}
        communitySlug={community.slug}
        existingEvent={event as Event}
        mode="edit"
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}