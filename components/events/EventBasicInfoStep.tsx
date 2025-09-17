"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { EventFormData } from "@/hooks/useEventStore";
import { MapPin, Monitor, Users } from "lucide-react";

interface EventBasicInfoStepProps {
  data: Partial<EventFormData>;
  errors: Record<string, string>;
  onChange: (data: Partial<EventFormData>) => void;
}

export default function EventBasicInfoStep({
  data,
  errors,
  onChange,
}: EventBasicInfoStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-1">Basic Information</h2>
        <p className="text-muted-foreground">
          Start by giving your event a name and description
        </p>
      </div>

      <div className="space-y-4">
        {/* Event Title */}
        <div className="space-y-2">
          <Label htmlFor="title">
            Event Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder="Enter event title"
            value={data.title || ""}
            onChange={(e) => onChange({ title: e.target.value })}
            className={errors.title ? "border-destructive" : ""}
            maxLength={200}
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {data.title?.length || 0}/200 characters
          </p>
        </div>

        {/* Event Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe your event..."
            value={data.description || ""}
            onChange={(e) => onChange({ description: e.target.value })}
            className={`min-h-[120px] ${errors.description ? "border-destructive" : ""}`}
            maxLength={5000}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {data.description?.length || 0}/5000 characters
          </p>
        </div>

        {/* Event Type */}
        <div className="space-y-3">
          <Label>
            Event Type <span className="text-destructive">*</span>
          </Label>
          <RadioGroup
            value={data.event_type || "physical"}
            onValueChange={(value: "physical" | "virtual" | "hybrid") =>
              onChange({ event_type: value })
            }
            className="space-y-3"
          >
            <Card className="p-4 cursor-pointer hover:bg-accent transition-colors">
              <label
                htmlFor="physical"
                className="flex items-start gap-3 cursor-pointer"
              >
                <RadioGroupItem value="physical" id="physical" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Physical Event</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    In-person event at a specific location
                  </p>
                </div>
              </label>
            </Card>

            <Card className="p-4 cursor-pointer hover:bg-accent transition-colors">
              <label
                htmlFor="virtual"
                className="flex items-start gap-3 cursor-pointer"
              >
                <RadioGroupItem value="virtual" id="virtual" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Virtual Event</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Online event with video conferencing or streaming
                  </p>
                </div>
              </label>
            </Card>

            <Card className="p-4 cursor-pointer hover:bg-accent transition-colors">
              <label
                htmlFor="hybrid"
                className="flex items-start gap-3 cursor-pointer"
              >
                <RadioGroupItem value="hybrid" id="hybrid" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Hybrid Event</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Both in-person and online attendance options
                  </p>
                </div>
              </label>
            </Card>
          </RadioGroup>
          {errors.event_type && (
            <p className="text-sm text-destructive">{errors.event_type}</p>
          )}
        </div>
      </div>
    </div>
  );
}