import { create } from "zustand";
import { DateTime } from "luxon";

export interface EventFormData {
  // Basic Information
  title: string;
  description: string;
  event_type: "physical" | "virtual" | "hybrid";

  // Date and Time
  start_at: string;
  end_at: string;
  timezone: string;

  // Location (Physical/Hybrid)
  venue_name: string;
  venue_address: string;
  venue_city: string;
  venue_country: string;

  // Online (Virtual/Hybrid)
  online_url: string;

  // Details
  capacity: number;
  image_url: string;
  tags: string[];

  // Recurring
  is_recurring: boolean;
  recurring_rule: string;
  recurring_end_date: string;

  // Metadata
  metadata: Record<string, unknown>;
}

interface EventStore {
  // Current wizard step
  currentStep: number;
  setCurrentStep: (step: number) => void;

  // Form data
  eventData: Partial<EventFormData>;
  updateEventData: (data: Partial<EventFormData>) => void;

  // Draft management
  draftId: string | null;
  setDraftId: (id: string | null) => void;
  saveDraft: () => void;
  loadDraft: (id: string) => void;
  clearDraft: () => void;

  // Validation
  validationErrors: Record<string, string>;
  setValidationError: (field: string, error: string) => void;
  clearValidationErrors: () => void;

  // Wizard state
  completedSteps: number[];
  markStepCompleted: (step: number) => void;
  isStepCompleted: (step: number) => boolean;

  // Reset
  resetStore: () => void;
}

const defaultEventData: Partial<EventFormData> = {
  title: "",
  description: "",
  event_type: "physical",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  venue_name: "",
  venue_address: "",
  venue_city: "",
  venue_country: "",
  online_url: "",
  capacity: 0,
  image_url: "",
  tags: [],
  is_recurring: false,
  recurring_rule: "",
  recurring_end_date: "",
  metadata: {},
};

export const useEventStore = create<EventStore>((set, get) => ({
      // Current step
      currentStep: 0,
      setCurrentStep: (step) => set({ currentStep: step }),

      // Form data
      eventData: { ...defaultEventData },
      updateEventData: (data) =>
        set((state) => ({
          eventData: { ...state.eventData, ...data }
        })),

      // Draft management
      draftId: null,
      setDraftId: (id) => set({ draftId: id }),

      saveDraft: () => {
        const state = get();
        const draftData = {
          eventData: state.eventData,
          currentStep: state.currentStep,
          completedSteps: state.completedSteps,
        };

        // Save to localStorage with timestamp
        const drafts = JSON.parse(localStorage.getItem("event_drafts") || "{}");
        const draftId = state.draftId || `draft_${Date.now()}`;

        drafts[draftId] = {
          ...draftData,
          savedAt: DateTime.now().toISO(),
        };

        localStorage.setItem("event_drafts", JSON.stringify(drafts));
        set({ draftId });

        console.log("[EventStore] Draft saved:", draftId);
      },

      loadDraft: (id) => {
        const drafts = JSON.parse(localStorage.getItem("event_drafts") || "{}");
        const draft = drafts[id];

        if (draft) {
          set({
            eventData: draft.eventData || {},
            currentStep: draft.currentStep || 0,
            completedSteps: draft.completedSteps || [],
            draftId: id,
          });

          console.log("[EventStore] Draft loaded:", id);
        }
      },

      clearDraft: () => {
        const state = get();

        if (state.draftId) {
          const drafts = JSON.parse(localStorage.getItem("event_drafts") || "{}");
          delete drafts[state.draftId];
          localStorage.setItem("event_drafts", JSON.stringify(drafts));
        }

        set({
          draftId: null,
          eventData: { ...defaultEventData },
          currentStep: 0,
          completedSteps: [],
          validationErrors: {},
        });
      },

      // Validation
      validationErrors: {},
      setValidationError: (field, error) =>
        set((state) => ({
          validationErrors: { ...state.validationErrors, [field]: error }
        })),
      clearValidationErrors: () => set({ validationErrors: {} }),

      // Wizard state
      completedSteps: [],
      markStepCompleted: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step]
        })),
      isStepCompleted: (step) => get().completedSteps.includes(step),

      // Reset
      resetStore: () => {
        get().clearDraft();
        set({
          currentStep: 0,
          eventData: { ...defaultEventData },
          draftId: null,
          validationErrors: {},
          completedSteps: [],
        });
      },
    }));

// Helper functions for common operations
export const validateEventStep = (step: number, data: Partial<EventFormData>): Record<string, string> => {
  const errors: Record<string, string> = {};

  switch (step) {
    case 0: // Basic Information
      if (!data.title?.trim()) errors.title = "Title is required";
      if (!data.event_type) errors.event_type = "Event type is required";
      break;

    case 1: // Date and Time
      if (!data.start_at) errors.start_at = "Start date is required";
      if (!data.end_at) errors.end_at = "End date is required";

      if (data.start_at && data.end_at) {
        const start = DateTime.fromISO(data.start_at);
        const end = DateTime.fromISO(data.end_at);

        if (end <= start) {
          errors.end_at = "End time must be after start time";
        }
      }

      if (data.is_recurring && !data.recurring_rule) {
        errors.recurring_rule = "Recurring pattern is required";
      }
      break;

    case 2: // Location
      if (data.event_type === "physical" || data.event_type === "hybrid") {
        if (!data.venue_name?.trim()) errors.venue_name = "Venue name is required";
        if (!data.venue_city?.trim()) errors.venue_city = "City is required";
      }

      if (data.event_type === "virtual" || data.event_type === "hybrid") {
        if (!data.online_url?.trim()) errors.online_url = "Online URL is required";

        if (data.online_url && !isValidUrl(data.online_url)) {
          errors.online_url = "Please enter a valid URL";
        }
      }
      break;

    case 3: // Details
      if (data.capacity && data.capacity < 0) {
        errors.capacity = "Capacity must be 0 or greater";
      }

      if (data.image_url && !isValidUrl(data.image_url)) {
        errors.image_url = "Please enter a valid image URL";
      }
      break;

    case 4: // Tickets & Pricing
      // No validation required for ticket step as it's optional
      // Tickets can be configured after event creation
      break;
  }

  return errors;
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Get all drafts
interface DraftData {
  eventData?: Partial<EventFormData>;
  savedAt: string;
  currentStep?: number;
}

export const getEventDrafts = () => {
  const drafts = JSON.parse(localStorage.getItem("event_drafts") || "{}") as Record<string, DraftData>;
  return Object.entries(drafts).map(([id, draft]) => ({
    id,
    title: draft.eventData?.title || "Untitled Event",
    savedAt: draft.savedAt,
    currentStep: draft.currentStep || 0,
  }));
};