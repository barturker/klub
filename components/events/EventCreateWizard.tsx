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
  { id: 4, name: "Tickets & Pricing", component: TicketTiersStep },
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

  // Initialize with existing event data if in edit mode
  useEffect(() => {
    if (mode === "edit" && existingEvent) {
      updateEventData(existingEvent);
      // Mark all steps as completed in edit mode
      for (let i = 0; i < WIZARD_STEPS.length - 1; i++) {
        markStepCompleted(i);
      }
    }
  }, [mode, existingEvent]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (eventData.title) {
        saveDraft();
        toast.success("Draft saved", {
          duration: 2000,
        });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [eventData, saveDraft]);

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
  const handleNext = () => {
    if (currentStep === 5) {
      // Submit the event from preview
      handleSubmit();
      return;
    }

    if (validateCurrentStep()) {
      markStepCompleted(currentStep);
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
      // Prepare event data for submission
      const submitData = {
        ...eventData,
        community_id: communityId,
        // Ensure dates are in ISO format - check for empty strings
        start_at: eventData.start_at && eventData.start_at.trim() !== ""
          ? eventData.start_at
          : DateTime.now().plus({ days: 7 }).toISO(),
        end_at: eventData.end_at && eventData.end_at.trim() !== ""
          ? eventData.end_at
          : DateTime.now().plus({ days: 7, hours: 2 }).toISO(),
        // Clean up empty fields - send empty strings as is (they'll be handled by the API)
        description: eventData.description || "",
        venue_name: eventData.venue_name || "",
        venue_address: eventData.venue_address || "",
        venue_city: eventData.venue_city || "",
        venue_country: eventData.venue_country || "",
        online_url: eventData.online_url || "",
        recurring_rule: eventData.recurring_rule || "",
        recurring_end_date: eventData.recurring_end_date || "",
        tags: eventData.tags || [],
        metadata: eventData.metadata || {},
      };

      let result;
      if (mode === "edit" && existingEvent) {
        result = await updateEvent.mutateAsync({ id: existingEvent.id, data: submitData });
        toast.success("Event updated successfully!");
      } else {
        result = await createEvent.mutateAsync(submitData);
        toast.success("Event created successfully!");
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
      console.error(`Failed to ${mode} event:`, error);
      const errorMessage = error instanceof Error ? error.message : `Failed to ${mode} event`;
      toast.error(errorMessage);
    }
  };

  // Save draft and exit
  const handleSaveDraft = () => {
    saveDraft();
    toast.success("Draft saved successfully");
    if (onCancel) {
      onCancel();
    } else {
      router.push(`/communities/${communitySlug}/events`);
    }
  };

  // Cancel and clear
  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel? Any unsaved changes will be lost.")) {
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
          {WIZARD_STEPS.map((step) => (
            <div
              key={step.id}
              className={`text-sm ${
                step.id === currentStep
                  ? "text-primary font-semibold"
                  : step.id < currentStep
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50"
              }`}
            >
              <div className="flex items-center gap-1">
                {isStepCompleted(step.id) && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {step.name}
              </div>
            </div>
          ))}
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
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
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
                (mode === "edit" ? "Updating..." : "Creating...") :
                (mode === "edit" ? "Update Event" : "Create Event")
              }
            </Button>
          ) : currentStep === 4 ? (
            <Button onClick={() => {
              if (validateCurrentStep()) {
                markStepCompleted(currentStep);
                setCurrentStep(5);
              }
            }}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
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