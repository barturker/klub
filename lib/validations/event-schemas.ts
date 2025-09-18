import { z } from "@/lib/z";

// Validation schema for updating an event
export const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  event_type: z.enum(["physical", "virtual", "hybrid"]).optional(),
  start_at: z.string().datetime({ offset: true }).optional(),
  end_at: z.string().datetime({ offset: true }).optional(),
  timezone: z.string().optional(),
  venue_name: z.string().optional(),
  venue_address: z.string().optional(),
  venue_city: z.string().optional(),
  venue_country: z.string().optional(),
  online_url: z.string().url().or(z.literal("")).optional(),
  capacity: z.number().min(0).optional(),
  image_url: z.string().url().or(z.literal("")).nullable().optional(),
  status: z.enum(["draft", "published", "cancelled"]).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  // Fields that might be sent but should be ignored/filtered
  id: z.string().optional(),
  community_id: z.string().optional(),
  created_by: z.string().optional(),
  slug: z.string().optional(),
  recurring_rule: z.string().nullable().optional(),
  recurring_end_date: z.string().nullable().optional(),
  parent_event_id: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  is_recurring: z.boolean().optional(),
  enable_ticketing: z.boolean().optional(),
  ticket_currency: z.string().optional(),
  // New fields from updated UI
  is_free: z.boolean().optional(),
  registration_only: z.boolean().optional(),
  // Nested objects that might be sent - these will be filtered out
  creator: z.object({
    id: z.string(),
    username: z.string().nullable(),
    full_name: z.string(),
    avatar_url: z.string().nullable(),
  }).optional(),
  recurring_instances: z.array(z.object({
    id: z.string(),
    start_at: z.string(),
    end_at: z.string(),
    status: z.string(),
  })).optional(),
});