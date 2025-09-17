"use client";

import dynamic from "next/dynamic";
import { Event } from "@/hooks/useEvents";

// Lazy load the heavy FullCalendar component
const EventCalendar = dynamic(() => import("./EventCalendar"), {
  ssr: false,
  loading: () => (
    <div className="bg-background rounded-lg border p-4">
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <svg
              className="w-6 h-6 text-primary animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    </div>
  ),
});

interface LazyEventCalendarProps {
  events: Event[];
  communitySlug: string;
  initialView?: "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek";
  height?: string;
  onEventClick?: (event: Event) => void;
  onDateClick?: (date: Date) => void;
}

export default function LazyEventCalendar(props: LazyEventCalendarProps) {
  return <EventCalendar {...props} />;
}