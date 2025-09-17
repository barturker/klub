"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import EventCreateWizard from "@/components/events/EventCreateWizard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Community {
  id: string;
  name: string;
  slug: string;
}

export default function CreateEventPage() {
  const params = useParams();
  const router = useRouter();
  const communitySlug = params.slug as string;

  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCommunity() {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("communities")
          .select("id, name, slug")
          .eq("slug", communitySlug)
          .single();

        if (error) throw error;

        setCommunity(data);
      } catch (err) {
        setError("Failed to load community information");
        console.error("Error fetching community:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCommunity();
  }, [communitySlug]);

  if (isLoading) {
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

  if (error || !community) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Community not found"}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const handleSuccess = (eventSlug: string) => {
    router.push(`/communities/${communitySlug}/events/${eventSlug}`);
  };

  const handleCancel = () => {
    router.push(`/communities/${communitySlug}/events`);
  };

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

        <h1 className="text-3xl font-bold">Create New Event</h1>
        <p className="text-muted-foreground">
          Set up a new event for {community.name}
        </p>
      </div>

      {/* Wizard */}
      <EventCreateWizard
        communityId={community.id}
        communityName={community.name}
        communitySlug={community.slug}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}