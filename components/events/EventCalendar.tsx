"use client";

import { useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { Event } from "@/hooks/useEvents";
import { DateTime } from "luxon";
import { useRouter } from "next/navigation";

interface EventCalendarProps {
  events: Event[];
  communitySlug: string;
  initialView?: "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek";
  height?: string;
  onEventClick?: (event: Event) => void;
  onDateClick?: (date: Date) => void;
}

export default function EventCalendar({
  events,
  communitySlug,
  initialView = "dayGridMonth",
  height = "600px",
  onEventClick,
  onDateClick,
}: EventCalendarProps) {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);

  // Convert events to FullCalendar format
  const calendarEvents = events.map((event) => {
    const startDt = DateTime.fromISO(event.start_at);
    const endDt = DateTime.fromISO(event.end_at);

    return {
      id: event.id,
      title: event.title,
      start: startDt.toJSDate(),
      end: endDt.toJSDate(),
      allDay: false,
      backgroundColor: getEventColor(event),
      borderColor: getEventColor(event),
      extendedProps: {
        event: event,
        description: event.description,
        location: event.venue_name || "Online",
        type: event.event_type,
        status: event.status,
        capacity: event.capacity,
        tags: event.tags,
      },
    };
  });

  function getEventColor(event: Event): string {
    if (event.status === "cancelled") return "#ef4444"; // red
    if (event.status === "draft") return "#6b7280"; // gray
    if (event.event_type === "virtual") return "#8b5cf6"; // purple
    if (event.event_type === "hybrid") return "#06b6d4"; // cyan
    return "#3b82f6"; // blue for physical
  }

  const handleEventClick = (info: any) => {
    const event = info.event.extendedProps.event as Event;
    if (onEventClick) {
      onEventClick(event);
    } else {
      // Default navigation to event page
      router.push(`/communities/${communitySlug}/events/${event.slug}`);
    }
  };

  const handleDateClick = (info: any) => {
    if (onDateClick) {
      onDateClick(info.date);
    }
  };

  return (
    <div className="bg-background rounded-lg border p-4">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={initialView}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        events={calendarEvents}
        height={height}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        editable={false}
        dayMaxEvents={3}
        weekends={true}
        eventDisplay="block"
        eventTimeFormat={{
          hour: "numeric",
          minute: "2-digit",
          meridiem: "short",
        }}
        slotLabelFormat={{
          hour: "numeric",
          minute: "2-digit",
          meridiem: "short",
        }}
        eventContent={(eventInfo) => {
          const event = eventInfo.event.extendedProps.event as Event;
          const isPast = DateTime.fromISO(event.end_at) < DateTime.now();

          return (
            <div
              className={`p-1 text-xs truncate ${
                isPast ? "opacity-60" : ""
              }`}
            >
              <div className="font-semibold truncate">{eventInfo.event.title}</div>
              {eventInfo.view.type !== "listWeek" && (
                <div className="truncate opacity-90">
                  {eventInfo.timeText}
                </div>
              )}
              {event.event_type === "virtual" && (
                <span className="text-[10px]">🌐 Online</span>
              )}
              {event.recurring_rule && (
                <span className="text-[10px] ml-1">🔁</span>
              )}
            </div>
          );
        }}
        eventMouseEnter={(info) => {
          // Add hover effect
          info.el.style.filter = "brightness(0.9)";
          info.el.style.cursor = "pointer";
        }}
        eventMouseLeave={(info) => {
          // Remove hover effect
          info.el.style.filter = "";
        }}
        buttonText={{
          today: "Today",
          month: "Month",
          week: "Week",
          day: "Day",
          list: "List",
        }}
        views={{
          dayGrid: {
            dayMaxEventRows: 3,
          },
          timeGrid: {
            slotMinTime: "06:00:00",
            slotMaxTime: "22:00:00",
            expandRows: true,
          },
          list: {
            buttonText: "List",
          },
        }}
        nowIndicator={true}
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5],
          startTime: "09:00",
          endTime: "18:00",
        }}
      />

      {/* Calendar Legend */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>In-Person</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-500" />
            <span>Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-cyan-500" />
            <span>Hybrid</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-500" />
            <span>Draft</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Cancelled</span>
          </div>
        </div>
      </div>
    </div>
  );
}