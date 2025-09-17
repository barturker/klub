"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventFormData } from "@/hooks/useEventStore";
import { Users, Image, Tag, X, Plus, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EventDetailsStepProps {
  data: Partial<EventFormData>;
  errors: Record<string, string>;
  onChange: (data: Partial<EventFormData>) => void;
}

const SUGGESTED_TAGS = [
  "Networking",
  "Workshop",
  "Social",
  "Educational",
  "Professional",
  "Casual",
  "Formal",
  "Outdoor",
  "Family-friendly",
  "18+",
  "Free",
  "Tech",
  "Art",
  "Music",
  "Sports",
  "Food",
];

export default function EventDetailsStep({
  data,
  errors,
  onChange,
}: EventDetailsStepProps) {
  const [tagInput, setTagInput] = useState("");

  const addTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (
      normalizedTag &&
      !data.tags?.includes(normalizedTag) &&
      data.tags?.length < 10
    ) {
      onChange({
        tags: [...(data.tags || []), normalizedTag],
      });
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange({
      tags: data.tags?.filter((tag) => tag !== tagToRemove) || [],
    });
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-1">Event Details</h2>
        <p className="text-muted-foreground">
          Add additional information about your event
        </p>
      </div>

      <div className="space-y-6">
        {/* Capacity */}
        <div className="space-y-2">
          <Label htmlFor="capacity">
            <Users className="h-4 w-4 inline mr-2" />
            Event Capacity
          </Label>
          <Input
            id="capacity"
            type="number"
            min="0"
            placeholder="0 for unlimited"
            value={data.capacity || 0}
            onChange={(e) =>
              onChange({ capacity: parseInt(e.target.value) || 0 })
            }
            className={errors.capacity ? "border-destructive" : ""}
          />
          {errors.capacity && (
            <p className="text-sm text-destructive">{errors.capacity}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Set to 0 for unlimited capacity. You can change this later.
          </p>
        </div>

        {/* Event Image */}
        <div className="space-y-2">
          <Label htmlFor="image-url">
            <Image className="h-4 w-4 inline mr-2" />
            Event Cover Image
          </Label>
          <Input
            id="image-url"
            type="url"
            placeholder="https://example.com/event-image.jpg"
            value={data.image_url || ""}
            onChange={(e) => onChange({ image_url: e.target.value })}
            className={errors.image_url ? "border-destructive" : ""}
          />
          {errors.image_url && (
            <p className="text-sm text-destructive">{errors.image_url}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Provide a URL to an image. Recommended size: 1920x1080px
          </p>

          {/* Image Preview */}
          {data.image_url && !errors.image_url && (
            <div className="mt-3 relative rounded-lg overflow-hidden border">
              <img
                src={data.image_url}
                alt="Event cover"
                className="w-full h-48 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  onChange({ image_url: "" });
                }}
              />
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label htmlFor="tags">
            <Tag className="h-4 w-4 inline mr-2" />
            Event Tags
          </Label>
          <div className="flex gap-2">
            <Input
              id="tags"
              placeholder="Add a tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              disabled={data.tags?.length >= 10}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => addTag(tagInput)}
              disabled={!tagInput || data.tags?.length >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Selected Tags */}
          {data.tags && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="px-2 py-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  onClick={() => removeTag(tag)}
                >
                  {tag}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {data.tags?.length || 0}/10 tags. Click a tag to remove it.
          </p>

          {/* Suggested Tags */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Suggested tags:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS.filter(
                (tag) => !data.tags?.includes(tag.toLowerCase())
              )
                .slice(0, 8)
                .map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => addTag(tag)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
            </div>
          </div>
        </div>

        {/* App Store Compliance Notice */}
        {data.event_type === "physical" && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>App Store Compliance:</strong> Physical events are properly marked
              for App Store guidelines. Make sure your venue information is accurate
              and complete.
            </AlertDescription>
          </Alert>
        )}

        {/* Additional Tips */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="font-medium">Tips for a successful event:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Use high-quality images that represent your event well</li>
              <li>Add relevant tags to help people discover your event</li>
              <li>Set a realistic capacity based on your venue or platform</li>
              <li>Consider creating a recurring event for regular meetups</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}