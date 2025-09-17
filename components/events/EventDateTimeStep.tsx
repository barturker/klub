"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EventFormData } from "@/hooks/useEventStore";
import { DateTime } from "luxon";
import { RRule, Frequency } from "rrule";
import { Calendar, Clock, Repeat } from "lucide-react";

interface EventDateTimeStepProps {
  data: Partial<EventFormData>;
  errors: Record<string, string>;
  onChange: (data: Partial<EventFormData>) => void;
}

const COMMON_TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Istanbul", label: "Istanbul (TRT)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)" },
];

const RECURRENCE_OPTIONS = [
  { value: "daily", label: "Daily", freq: Frequency.DAILY },
  { value: "weekly", label: "Weekly", freq: Frequency.WEEKLY },
  { value: "biweekly", label: "Every 2 Weeks", freq: Frequency.WEEKLY, interval: 2 },
  { value: "monthly", label: "Monthly", freq: Frequency.MONTHLY },
];

export default function EventDateTimeStep({
  data,
  errors,
  onChange,
}: EventDateTimeStepProps) {
  const [localStartDate, setLocalStartDate] = useState("");
  const [localStartTime, setLocalStartTime] = useState("");
  const [localEndDate, setLocalEndDate] = useState("");
  const [localEndTime, setLocalEndTime] = useState("");
  const [recurringPreview, setRecurringPreview] = useState<Date[]>([]);

  // Initialize local state from data
  useEffect(() => {
    if (data.start_at) {
      const dt = DateTime.fromISO(data.start_at);
      setLocalStartDate(dt.toFormat("yyyy-MM-dd"));
      setLocalStartTime(dt.toFormat("HH:mm"));
    }
    if (data.end_at) {
      const dt = DateTime.fromISO(data.end_at);
      setLocalEndDate(dt.toFormat("yyyy-MM-dd"));
      setLocalEndTime(dt.toFormat("HH:mm"));
    }
  }, [data.start_at, data.end_at]);

  // Update recurring preview when pattern changes
  useEffect(() => {
    if (data.is_recurring && data.recurring_rule && data.start_at) {
      try {
        const rule = RRule.fromString(data.recurring_rule);
        const startDt = DateTime.fromISO(data.start_at);
        const endDt = data.recurring_end_date
          ? DateTime.fromISO(data.recurring_end_date)
          : startDt.plus({ months: 3 });

        const occurrences = rule.between(
          startDt.toJSDate(),
          endDt.toJSDate(),
          true
        ).slice(0, 5); // Show first 5 occurrences

        setRecurringPreview(occurrences);
      } catch (error) {
        console.error("Error generating recurring preview:", error);
        setRecurringPreview([]);
      }
    } else {
      setRecurringPreview([]);
    }
  }, [data.is_recurring, data.recurring_rule, data.start_at, data.recurring_end_date]);

  const updateDateTime = (field: "start" | "end", type: "date" | "time", value: string) => {
    const dateKey = field === "start" ? localStartDate : localEndDate;
    const timeKey = field === "start" ? localStartTime : localEndTime;

    let newDate = dateKey;
    let newTime = timeKey;

    if (type === "date") {
      newDate = value;
      if (field === "start") setLocalStartDate(value);
      else setLocalEndDate(value);
    } else {
      newTime = value;
      if (field === "start") setLocalStartTime(value);
      else setLocalEndTime(value);
    }

    if (newDate && newTime) {
      const dt = DateTime.fromFormat(
        `${newDate} ${newTime}`,
        "yyyy-MM-dd HH:mm",
        { zone: data.timezone || "UTC" }
      );

      onChange({
        [`${field}_at`]: dt.toISO(),
      });
    }
  };

  const handleRecurringPatternChange = (pattern: string) => {
    const option = RECURRENCE_OPTIONS.find(o => o.value === pattern);
    if (!option || !data.start_at) return;

    const startDt = DateTime.fromISO(data.start_at);
    const rule = new RRule({
      freq: option.freq,
      interval: option.interval || 1,
      dtstart: startDt.toJSDate(),
      until: data.recurring_end_date
        ? DateTime.fromISO(data.recurring_end_date).toJSDate()
        : startDt.plus({ months: 3 }).toJSDate(),
    });

    onChange({
      recurring_rule: rule.toString(),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-1">Date & Time</h2>
        <p className="text-muted-foreground">
          When will your event take place?
        </p>
      </div>

      <div className="space-y-4">
        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone">
            <Clock className="h-4 w-4 inline mr-2" />
            Timezone
          </Label>
          <Select
            value={data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
            onValueChange={(value) => onChange({ timezone: value })}
          >
            <SelectTrigger id="timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Start Date/Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">
              <Calendar className="h-4 w-4 inline mr-2" />
              Start Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="start-date"
              type="date"
              value={localStartDate}
              onChange={(e) => updateDateTime("start", "date", e.target.value)}
              className={errors.start_at ? "border-destructive" : ""}
              min={DateTime.now().toFormat("yyyy-MM-dd")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start-time">
              Start Time <span className="text-destructive">*</span>
            </Label>
            <Input
              id="start-time"
              type="time"
              value={localStartTime}
              onChange={(e) => updateDateTime("start", "time", e.target.value)}
              className={errors.start_at ? "border-destructive" : ""}
            />
          </div>
        </div>
        {errors.start_at && (
          <p className="text-sm text-destructive">{errors.start_at}</p>
        )}

        {/* End Date/Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="end-date">
              End Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="end-date"
              type="date"
              value={localEndDate}
              onChange={(e) => updateDateTime("end", "date", e.target.value)}
              className={errors.end_at ? "border-destructive" : ""}
              min={localStartDate}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-time">
              End Time <span className="text-destructive">*</span>
            </Label>
            <Input
              id="end-time"
              type="time"
              value={localEndTime}
              onChange={(e) => updateDateTime("end", "time", e.target.value)}
              className={errors.end_at ? "border-destructive" : ""}
            />
          </div>
        </div>
        {errors.end_at && (
          <p className="text-sm text-destructive">{errors.end_at}</p>
        )}

        {/* Recurring Event */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="recurring">
                <Repeat className="h-4 w-4 inline mr-2" />
                Recurring Event
              </Label>
              <p className="text-sm text-muted-foreground">
                Create a series of repeated events
              </p>
            </div>
            <Switch
              id="recurring"
              checked={data.is_recurring || false}
              onCheckedChange={(checked) => onChange({ is_recurring: checked })}
            />
          </div>

          {data.is_recurring && (
            <>
              <div className="space-y-2">
                <Label htmlFor="pattern">Recurrence Pattern</Label>
                <Select
                  value={
                    RECURRENCE_OPTIONS.find(o =>
                      data.recurring_rule?.includes(o.freq.toString())
                    )?.value || "weekly"
                  }
                  onValueChange={handleRecurringPatternChange}
                >
                  <SelectTrigger id="pattern">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurring-end">End Recurrence On</Label>
                <Input
                  id="recurring-end"
                  type="date"
                  value={
                    data.recurring_end_date
                      ? DateTime.fromISO(data.recurring_end_date).toFormat("yyyy-MM-dd")
                      : ""
                  }
                  onChange={(e) =>
                    onChange({
                      recurring_end_date: e.target.value
                        ? DateTime.fromFormat(e.target.value, "yyyy-MM-dd").toISO()
                        : "",
                    })
                  }
                  min={localStartDate}
                />
              </div>

              {recurringPreview.length > 0 && (
                <div className="space-y-2">
                  <Label>Preview (First 5 occurrences)</Label>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {recurringPreview.map((date, i) => (
                      <div key={i}>
                        {DateTime.fromJSDate(date).toFormat("EEE, MMM d, yyyy")}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}