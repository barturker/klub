"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EventFormData } from "@/hooks/useEventStore";
import { MapPin, Globe, Video, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EventLocationStepProps {
  data: Partial<EventFormData>;
  errors: Record<string, string>;
  onChange: (data: Partial<EventFormData>) => void;
}

const COMMON_ONLINE_PLATFORMS = [
  { name: "Zoom", example: "https://zoom.us/j/123456789" },
  { name: "Google Meet", example: "https://meet.google.com/abc-defg-hij" },
  { name: "Microsoft Teams", example: "https://teams.microsoft.com/l/meetup-join/..." },
  { name: "YouTube Live", example: "https://youtube.com/live/..." },
];

export default function EventLocationStep({
  data,
  errors,
  onChange,
}: EventLocationStepProps) {
  const showPhysicalLocation = data.event_type === "physical" || data.event_type === "hybrid";
  const showOnlineLocation = data.event_type === "virtual" || data.event_type === "hybrid";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-1">Location Details</h2>
        <p className="text-muted-foreground">
          Where will your {data.event_type} event take place?
        </p>
      </div>

      {data.event_type === "hybrid" && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            As a hybrid event, you need to provide both physical venue and online access details.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Physical Location */}
        {showPhysicalLocation && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <MapPin className="h-5 w-5" />
              Physical Location
            </div>

            <div className="space-y-4 pl-7">
              {/* Venue Name */}
              <div className="space-y-2">
                <Label htmlFor="venue-name">
                  Venue Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="venue-name"
                  placeholder="e.g., Community Center, Coffee Shop, Park"
                  value={data.venue_name || ""}
                  onChange={(e) => onChange({ venue_name: e.target.value })}
                  className={errors.venue_name ? "border-destructive" : ""}
                />
                {errors.venue_name && (
                  <p className="text-sm text-destructive">{errors.venue_name}</p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="venue-address">Street Address</Label>
                <Textarea
                  id="venue-address"
                  placeholder="123 Main Street, Suite 100"
                  value={data.venue_address || ""}
                  onChange={(e) => onChange({ venue_address: e.target.value })}
                  className={`min-h-[80px] ${errors.venue_address ? "border-destructive" : ""}`}
                />
                {errors.venue_address && (
                  <p className="text-sm text-destructive">{errors.venue_address}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="venue-city">
                    City <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="venue-city"
                    placeholder="San Francisco"
                    value={data.venue_city || ""}
                    onChange={(e) => onChange({ venue_city: e.target.value })}
                    className={errors.venue_city ? "border-destructive" : ""}
                  />
                  {errors.venue_city && (
                    <p className="text-sm text-destructive">{errors.venue_city}</p>
                  )}
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <Label htmlFor="venue-country">Country</Label>
                  <Input
                    id="venue-country"
                    placeholder="United States"
                    value={data.venue_country || ""}
                    onChange={(e) => onChange({ venue_country: e.target.value })}
                    className={errors.venue_country ? "border-destructive" : ""}
                  />
                  {errors.venue_country && (
                    <p className="text-sm text-destructive">{errors.venue_country}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Online Location */}
        {showOnlineLocation && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <Video className="h-5 w-5" />
              Online Access
            </div>

            <div className="space-y-4 pl-7">
              {/* Online URL */}
              <div className="space-y-2">
                <Label htmlFor="online-url">
                  Meeting/Stream URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="online-url"
                  type="url"
                  placeholder="https://zoom.us/j/123456789"
                  value={data.online_url || ""}
                  onChange={(e) => onChange({ online_url: e.target.value })}
                  className={errors.online_url ? "border-destructive" : ""}
                />
                {errors.online_url && (
                  <p className="text-sm text-destructive">{errors.online_url}</p>
                )}

                {/* Platform Examples */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Common platforms:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {COMMON_ONLINE_PLATFORMS.map((platform) => (
                      <div key={platform.name} className="space-y-1">
                        <div className="font-medium flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {platform.name}
                        </div>
                        <div className="pl-4 truncate text-muted-foreground/70">
                          {platform.example}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Additional Online Instructions */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p>Remember to:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Include meeting password in event description if required</li>
                    <li>Test the link before publishing the event</li>
                    <li>Consider time zones for international attendees</li>
                    {data.event_type === "hybrid" && (
                      <li>Explain how online attendees can participate</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}