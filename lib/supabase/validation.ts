/**
 * Zod validation schemas for database types
 * Ensures type safety at runtime for API routes and forms
 */

import { z } from 'zod'
import type { Enums } from './database.types'
import { Constants } from './database.types'

// ============================================================================
// Enum Schemas (matching database enums exactly)
// ============================================================================

export const eventStatusSchema = z.enum(
  Constants.public.Enums.event_status as readonly [string, ...string[]]
) satisfies z.ZodType<Enums<'event_status'>>

export const memberRoleSchema = z.enum(
  Constants.public.Enums.member_role as readonly [string, ...string[]]
) satisfies z.ZodType<Enums<'member_role'>>

export const ticketStatusSchema = z.enum(
  Constants.public.Enums.ticket_status as readonly [string, ...string[]]
) satisfies z.ZodType<Enums<'ticket_status'>>

export const orderStatusSchema = z.enum(
  Constants.public.Enums.order_status as readonly [string, ...string[]]
) satisfies z.ZodType<Enums<'order_status'>>

export const paymentProviderSchema = z.enum(
  Constants.public.Enums.payment_provider as readonly [string, ...string[]]
) satisfies z.ZodType<Enums<'payment_provider'>>

export const passStatusSchema = z.enum(
  Constants.public.Enums.pass_status as readonly [string, ...string[]]
) satisfies z.ZodType<Enums<'pass_status'>>

// ============================================================================
// Common Field Schemas
// ============================================================================

export const uuidSchema = z.string().uuid()
export const emailSchema = z.string().email().toLowerCase()
export const slugSchema = z.string()
  .min(3)
  .max(50)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format')
export const usernameSchema = z.string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
export const urlSchema = z.string().url().nullable()
export const dateTimeSchema = z.string().datetime()
export const currencySchema = z.string()
  .length(3)
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Invalid currency code')

// JSON metadata schema (flexible but typed)
export const metadataSchema = z.record(z.unknown()).default({})

// Price in cents (must be positive)
export const priceCentsSchema = z.number()
  .int()
  .min(0)
  .max(999999999) // Max ~$10M

// ============================================================================
// Entity Creation/Update Schemas
// ============================================================================

// Profile schemas
export const profileCreateSchema = z.object({
  id: uuidSchema,
  email: emailSchema.nullable(),
  username: usernameSchema.nullable(),
  full_name: z.string().min(1).max(100).nullable(),
  avatar_url: urlSchema,
  bio: z.string().max(500).nullable(),
  created_at: dateTimeSchema.optional(),
  updated_at: dateTimeSchema.optional()
})

export const profileUpdateSchema = profileCreateSchema.partial().omit({ 
  id: true, 
  created_at: true 
})

// Community schemas
export const communityCreateSchema = z.object({
  name: z.string().min(2).max(100),
  slug: slugSchema,
  description: z.string().max(1000).nullable(),
  avatar_url: urlSchema,
  cover_image_url: urlSchema,
  is_public: z.boolean().default(true),
  organizer_id: uuidSchema
})

export const communityUpdateSchema = communityCreateSchema.partial().omit({ 
  organizer_id: true,
  slug: true // Slug shouldn't change after creation
})

// Event schemas
export const eventCreateSchema = z.object({
  community_id: uuidSchema,
  title: z.string().min(3).max(200),
  slug: slugSchema,
  description: z.string().max(5000).nullable(),
  start_at: dateTimeSchema,
  end_at: dateTimeSchema.nullable(),
  venue_name: z.string().max(200).nullable(),
  venue_address: z.string().max(500).nullable(),
  venue_geo: z.any().nullable(), // Handled server-side
  capacity: z.number().int().min(1).max(100000).nullable(),
  price_cents: priceCentsSchema,
  currency: currencySchema.default('USD'),
  status: eventStatusSchema.default('draft'),
  created_by: uuidSchema.optional(),
  metadata: metadataSchema
})

export const eventUpdateSchema = eventCreateSchema.partial().omit({
  community_id: true,
  created_by: true
})

// Order schemas
export const orderCreateSchema = z.object({
  event_id: uuidSchema,
  buyer_id: uuidSchema.nullable(),
  quantity: z.number().int().min(1).max(100),
  amount_cents: priceCentsSchema,
  currency: currencySchema.default('USD'),
  status: orderStatusSchema.default('pending'),
  provider: paymentProviderSchema.default('stripe'),
  provider_ref: z.string().max(255).nullable(),
  metadata: metadataSchema
})

export const orderUpdateSchema = z.object({
  status: orderStatusSchema.optional(),
  provider_ref: z.string().max(255).nullable().optional(),
  metadata: metadataSchema.optional()
})

// Ticket schemas
export const ticketCreateSchema = z.object({
  event_id: uuidSchema,
  user_id: uuidSchema,
  order_id: uuidSchema.nullable(),
  amount: priceCentsSchema,
  currency: currencySchema.default('USD'),
  status: ticketStatusSchema.default('pending'),
  stripe_payment_intent_id: z.string().max(255).nullable(),
  stripe_charge_id: z.string().max(255).nullable()
})

export const ticketUpdateSchema = z.object({
  status: ticketStatusSchema.optional(),
  stripe_payment_intent_id: z.string().max(255).nullable().optional(),
  stripe_charge_id: z.string().max(255).nullable().optional()
})

// Pass schemas (usually created via RPC, not direct insert)
export const passCreateSchema = z.object({
  ticket_id: uuidSchema,
  secure_code: z.string().min(10).max(100),
  status: passStatusSchema.default('valid')
})

export const passUpdateSchema = z.object({
  status: passStatusSchema.optional()
})

// Check-in schemas
export const checkinCreateSchema = z.object({
  ticket_id: uuidSchema,
  pass_id: uuidSchema.nullable(),
  result: z.string().max(50),
  scanned_by: uuidSchema.nullable(),
  metadata: metadataSchema
})

// ============================================================================
// API Request/Response Schemas
// ============================================================================

// Purchase ticket request
export const purchaseTicketRequestSchema = z.object({
  eventId: uuidSchema,
  userId: uuidSchema,
  amount: priceCentsSchema,
  currency: currencySchema.optional(),
  provider: paymentProviderSchema.optional(),
  metadata: metadataSchema.optional()
})

// Process check-in request
export const processCheckinRequestSchema = z.object({
  secureCode: z.string().min(10),
  scannedBy: uuidSchema.optional(),
  metadata: metadataSchema.optional()
})

// Event search request
export const eventSearchRequestSchema = z.object({
  query: z.string().min(2).max(100),
  status: eventStatusSchema.optional(),
  communityId: uuidSchema.optional(),
  startAfter: dateTimeSchema.optional(),
  startBefore: dateTimeSchema.optional(),
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0)
})

// ============================================================================
// Form Schemas (for client-side validation)
// ============================================================================

// Sign up form
export const signUpFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(100),
  username: usernameSchema,
  fullName: z.string().min(1).max(100)
})

// Create event form
export const createEventFormSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  startAt: z.date(),
  endAt: z.date().optional(),
  venueName: z.string().max(200).optional(),
  venueAddress: z.string().max(500).optional(),
  capacity: z.number().int().min(1).optional(),
  price: z.number().min(0).max(10000), // Price in dollars, converted to cents
  currency: currencySchema.default('USD')
}).refine(
  (data) => !data.endAt || data.endAt > data.startAt,
  { message: "End date must be after start date", path: ["endAt"] }
)

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse data and throw descriptive error if validation fails
 * Useful for API routes and server actions
 */
export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue.path.length > 0 ? issue.path.join('.') : 'root'
    throw new Error(`Validation failed at ${path}: ${issue.message}`)
  }
  
  return result.data
}

/**
 * Parse data and return result object with success flag
 * Useful for form validation where you want to show errors
 */
export function safeParse<T>(schema: z.ZodType<T>, data: unknown): 
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: z.ZodError } {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data, error: null }
  }
  
  return { success: false, data: null, error: result.error }
}

/**
 * Format Zod errors for display in forms
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {}
  
  error.issues.forEach(issue => {
    const path = issue.path.join('.')
    formatted[path] = issue.message
  })
  
  return formatted
}

// ============================================================================
// Type Exports
// ============================================================================

export type ProfileCreate = z.infer<typeof profileCreateSchema>
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>
export type CommunityCreate = z.infer<typeof communityCreateSchema>
export type CommunityUpdate = z.infer<typeof communityUpdateSchema>
export type EventCreate = z.infer<typeof eventCreateSchema>
export type EventUpdate = z.infer<typeof eventUpdateSchema>
export type OrderCreate = z.infer<typeof orderCreateSchema>
export type OrderUpdate = z.infer<typeof orderUpdateSchema>
export type TicketCreate = z.infer<typeof ticketCreateSchema>
export type TicketUpdate = z.infer<typeof ticketUpdateSchema>
export type PassCreate = z.infer<typeof passCreateSchema>
export type PassUpdate = z.infer<typeof passUpdateSchema>
export type CheckinCreate = z.infer<typeof checkinCreateSchema>

export type PurchaseTicketRequest = z.infer<typeof purchaseTicketRequestSchema>
export type ProcessCheckinRequest = z.infer<typeof processCheckinRequestSchema>
export type EventSearchRequest = z.infer<typeof eventSearchRequestSchema>

export type SignUpForm = z.infer<typeof signUpFormSchema>
export type CreateEventForm = z.infer<typeof createEventFormSchema>