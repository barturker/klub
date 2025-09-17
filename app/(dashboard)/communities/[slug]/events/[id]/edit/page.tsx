"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useEvent } from "@/hooks/useEvents";
import EventCreateWizard from "@/components/events/EventCreateWizard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const communitySlug = params.slug as string;
  const eventId = params.id as string;

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const {
    data,
    isLoading: eventLoading,
    error: eventError,
  } = useEvent(eventId);

  const event = data?.event;

  useEffect(() => {
    async function checkAuthorization() {
      if (!event) return;

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Check if user is the event creator or community admin
          const isCreator = event.created_by === user.id;

          const { data: membership } = await supabase
            .from("community_members")
            .select("role")
            .eq("community_id", event.community_id)
            .eq("user_id", user.id)
            .single();

          const isAdmin = membership?.role === "admin";

          setIsAuthorized(isCreator || isAdmin);

          if (!isCreator && !isAdmin) {
            toast.error("You don't have permission to edit this event");
            router.push(`/communities/${communitySlug}/events/${eventId}`);
          }
        } else {
          toast.error("You must be logged in to edit events");
          router.push(`/communities/${communitySlug}/events/${eventId}`);
        }
      } catch (err) {
        console.error("Error checking authorization:", err);
        toast.error("Failed to verify permissions");
        router.push(`/communities/${communitySlug}/events/${eventId}`);
      } finally {
        setIsChecking(false);
      }
    }

    checkAuthorization();
  }, [event, eventId, communitySlug, router]);

  const handleSuccess = (eventSlug: string) => {
    toast.success("Event updated successfully!");
    router.push(`/communities/${communitySlug}/events/${eventSlug}`);
  };

  const handleCancel = () => {
    router.push(`/communities/${communitySlug}/events/${eventId}`);
  };

  if (eventLoading || isChecking) {
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

  if (!isAuthorized) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <p className="text-destructive mb-4">
            You don&apos;t have permission to edit this event
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
          href={`/communities/${communitySlug}/events/${eventId}`}
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

      {/* Edit Wizard - Reusing the same wizard with edit mode */}
      <EventCreateWizard
        communityId={event.community_id}
        communityName={event.community?.name || ""}
        communitySlug={communitySlug}
        existingEvent={event}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        mode="edit"
      />
    </div>
  );
}