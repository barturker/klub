"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useEventStore, validateEventStep } from "@/hooks/useEventStore";
import { useCreateEvent, useUpdateEvent, Event } from "@/hooks/useEvents";
import EventBasicInfoStep from "./EventBasicInfoStep";
import EventDateTimeStep from "./EventDateTimeStep";
import EventLocationStep from "./EventLocationStep";
import EventDetailsStep from "./EventDetailsStep";
import TicketTiersStep from "./TicketTiersStep";
import EventPreview from "./EventPreview";
import { ArrowLeft, ArrowRight, Save, Eye, CheckCircle } from "lucide-react";
import { DateTime } from "luxon";

interface EventCreateWizardProps {
  communityId: string;
  communityName: string;
  communitySlug: string;
  existingEvent?: Event;
  mode?: "create" | "edit";
  onSuccess?: (eventSlug: string) => void;
  onCancel?: () => void;
}

const WIZARD_STEPS = [
  { id: 0, name: "Basic Information", component: EventBasicInfoStep },
  { id: 1, name: "Date & Time", component: EventDateTimeStep },
  { id: 2, name: "Location", component: EventLocationStep },
  { id: 3, name: "Details", component: EventDetailsStep },
  { id: 4, name: "Tickets (Optional)", component: TicketTiersStep },
  { id: 5, name: "Preview", component: EventPreview },
];

export default function EventCreateWizard({
  communityId,
  communityName,
  communitySlug,
  existingEvent,
  mode = "create",
  onSuccess,
  onCancel,
}: EventCreateWizardProps) {
  const router = useRouter();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const [isPreview, setIsPreview] = useState(false);
  // Remove draft logic - we'll create the event directly when publishing

  const {
    currentStep,
    setCurrentStep,
    eventData,
    updateEventData,
    saveDraft,
    markStepCompleted,
    isStepCompleted,
    validationErrors,
    setValidationError,
    clearValidationErrors,
    resetStore,
  } = useEventStore();

  // Initialize wizard
  useEffect(() => {
    if (mode === "edit" && existingEvent) {
      // Edit mode: load existing event data
      updateEventData(existingEvent);
      // Mark all steps as completed in edit mode
      for (let i = 0; i < WIZARD_STEPS.length - 1; i++) {
        markStepCompleted(i);
      }
    } else if (mode === "create") {
      // Create mode: always start fresh
      resetStore();
    }
  }, [mode, existingEvent]);

  // Remove auto-save functionality

  // Validate current step
  const validateCurrentStep = () => {
    const errors = validateEventStep(currentStep, eventData);

    if (Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([field, error]) => {
        setValidationError(field, error);
      });
      toast.error("Please fix the errors before continuing");
      return false;
    }

    clearValidationErrors();
    return true;
  };

  // Navigate to next step
  const handleNext = async () => {
    if (currentStep === 5) {
      // Submit the event from preview
      handleSubmit();
      return;
    }

    if (validateCurrentStep()) {
      markStepCompleted(currentStep);

      // No need to create draft anymore
      setCurrentStep(currentStep + 1);
    }
  };


  // Navigate to previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit the event
  const handleSubmit = async () => {
    try {
      let result;

      if (mode === "create") {
        // Create and publish the event directly
        // Remove fields that don't exist in the database
        const { enable_ticketing, ticket_currency, is_recurring, ...cleanEventData } = eventData;

        const createData = {
          ...cleanEventData,
          status: 'published',
          community_id: communityId,
          // Ensure dates are in ISO format
          start_at: cleanEventData.start_at && cleanEventData.start_at.trim() !== ""
            ? cleanEventData.start_at
            : DateTime.now().plus({ days: 7 }).toISO(),
          end_at: cleanEventData.end_at && cleanEventData.end_at.trim() !== ""
            ? cleanEventData.end_at
            : DateTime.now().plus({ days: 7, hours: 2 }).toISO(),
          // Clean up empty fields
          description: cleanEventData.description || "",
          venue_name: cleanEventData.venue_name || "",
          venue_address: cleanEventData.venue_address || "",
          venue_city: cleanEventData.venue_city || "",
          venue_country: cleanEventData.venue_country || "",
          online_url: cleanEventData.online_url || "",
          recurring_rule: cleanEventData.recurring_rule || null,
          recurring_end_date: cleanEventData.recurring_end_date || null,
          tags: cleanEventData.tags || [],
          metadata: cleanEventData.metadata || {},
        };

        result = await createEvent.mutateAsync(createData);
        toast.success("Event created successfully!");
      } else {
        // For edit mode, update the existing event
        // Remove fields that don't exist in the database and nested objects
        const {
          enable_ticketing,
          ticket_currency,
          is_recurring,
          creator,
          recurring_instances,
          ...cleanEventData
        } = eventData;

        // Debug: Let's see what we're sending
        console.log("[EventCreateWizard] === UPDATE MODE DEBUG START ===");
        console.log("[EventCreateWizard] Original eventData keys:", Object.keys(eventData));
        console.log("[EventCreateWizard] Original eventData:", JSON.stringify(eventData, null, 2));
        console.log("[EventCreateWizard] Fields removed:", {
          enable_ticketing,
          ticket_currency,
          is_recurring,
          creator,
          recurring_instances
        });
        console.log("[EventCreateWizard] Cleaned eventData keys:", Object.keys(cleanEventData));
        console.log("[EventCreateWizard] Cleaned eventData:", JSON.stringify(cleanEventData, null, 2));

        const submitData = {
          ...cleanEventData,
          community_id: communityId,
          // Ensure dates are in ISO format
          start_at: cleanEventData.start_at && cleanEventData.start_at.trim() !== ""
            ? cleanEventData.start_at
            : DateTime.now().plus({ days: 7 }).toISO(),
          end_at: cleanEventData.end_at && cleanEventData.end_at.trim() !== ""
            ? cleanEventData.end_at
            : DateTime.now().plus({ days: 7, hours: 2 }).toISO(),
          // Clean up empty fields
          description: cleanEventData.description || "",
          venue_name: cleanEventData.venue_name || "",
          venue_address: cleanEventData.venue_address || "",
          venue_city: cleanEventData.venue_city || "",
          venue_country: cleanEventData.venue_country || "",
          online_url: cleanEventData.online_url || "",
          recurring_rule: cleanEventData.recurring_rule || null,
          recurring_end_date: cleanEventData.recurring_end_date || null,
          tags: cleanEventData.tags || [],
          metadata: cleanEventData.metadata || {},
        };

        console.log("[EventCreateWizard] Final submitData keys:", Object.keys(submitData));
        console.log("[EventCreateWizard] Final submitData being sent:", JSON.stringify(submitData, null, 2));
        console.log("[EventCreateWizard] Sending to event ID:", existingEvent!.id);
        console.log("[EventCreateWizard] === UPDATE MODE DEBUG END ===");

        result = await updateEvent.mutateAsync({ id: existingEvent!.id, data: submitData });
        toast.success("Event updated successfully!");
      }

      // Clear the store
      resetStore();

      // Call success callback or redirect
      if (onSuccess) {
        onSuccess(result.slug);
      } else {
        router.push(`/communities/${communitySlug}/events/${result.slug}`);
      }
    } catch (error) {
      console.error(`Failed to ${mode === 'create' ? 'publish' : 'update'} event:`, error);
      const errorMessage = error instanceof Error ? error.message : `Failed to ${mode === 'create' ? 'publish' : 'update'} event`;
      toast.error(errorMessage);
    }
  };

  // Cancel and clear all data
  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel? All data will be lost.")) {
      resetStore();
      if (onCancel) {
        onCancel();
      } else {
        router.push(`/communities/${communitySlug}/events`);
      }
    }
  };

  const CurrentStepComponent = WIZARD_STEPS[currentStep].component;
  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{mode === "edit" ? "Edit Event" : "Create New Event"}</h1>
        <p className="text-muted-foreground">
          {mode === "edit" ? "Updating" : "Creating"} event for <span className="font-semibold">{communityName}</span>
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2">
          {WIZARD_STEPS.map((step) => {
            const isClickable = mode === "edit" && (isStepCompleted(step.id) || step.id === 0);

            return (
              <div
                key={step.id}
                onClick={() => {
                  if (isClickable) {
                    setCurrentStep(step.id);
                  }
                }}
                className={`text-sm ${
                  step.id === currentStep
                    ? "text-primary font-semibold"
                    : step.id < currentStep
                    ? "text-muted-foreground"
                    : "text-muted-foreground/50"
                } ${isClickable ? "cursor-pointer hover:text-primary transition-colors" : ""}`}
              >
                <div className="flex items-center gap-1">
                  {isStepCompleted(step.id) && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {step.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <Card className="p-6">
        {currentStep === 5 ? (
          <EventPreview
            eventData={eventData}
            communityName={communityName}
            onEdit={() => setCurrentStep(3)}
          />
        ) : currentStep === 4 ? (
          <CurrentStepComponent
            eventId={existingEvent?.id}
            data={eventData}
            errors={validationErrors}
            onChange={updateEventData}
          />
        ) : (
          <CurrentStepComponent
            data={eventData}
            errors={validationErrors}
            onChange={updateEventData}
          />
        )}
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center mt-6">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>

        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handlePrevious}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}

          {currentStep === 5 ? (
            <Button
              onClick={handleSubmit}
              disabled={createEvent.isPending || updateEvent.isPending}
            >
              {(createEvent.isPending || updateEvent.isPending) ?
                (mode === "edit" ? "Updating..." : "Publishing...") :
                (mode === "edit" ? "Update Event" : "Publish Event")
              }
            </Button>
          ) : currentStep === 4 ? (
            <>
              <Button variant="outline" onClick={() => {
                // Skip ticket configuration and go to preview
                markStepCompleted(currentStep);
                setCurrentStep(5);
              }}>
                Skip for now
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button onClick={() => {
                if (validateCurrentStep()) {
                  markStepCompleted(currentStep);
                  setCurrentStep(5);
                }
              }}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}