/**
 * Database type helpers for ergonomic TypeScript usage
 * Provides shortcuts and utilities for working with Supabase types
 */

import type { 
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums
} from './database.types'

// ============================================================================
// Generic Type Helpers
// ============================================================================

/**
 * Extract a row type from any table
 * @example
 * type EventRow = Row<'events'>
 */
export type Row<T extends keyof Database['public']['Tables']> = Tables<T>

/**
 * Extract an insert type for any table
 * @example
 * const newEvent: Insert<'events'> = { title: 'Concert', ... }
 */
export type Insert<T extends keyof Database['public']['Tables']> = TablesInsert<T>

/**
 * Extract an update type for any table
 * @example
 * const updates: Update<'events'> = { title: 'Updated Title' }
 */
export type Update<T extends keyof Database['public']['Tables']> = TablesUpdate<T>

/**
 * Extract an enum type
 * @example
 * const status: Enum<'event_status'> = 'published'
 */
export type Enum<T extends keyof Database['public']['Enums']> = Enums<T>

// ============================================================================
// Table Row Types (for convenience)
// ============================================================================

export type Profile = Row<'profiles'>
export type Community = Row<'communities'>
export type CommunityMember = Row<'community_members'>
export type Event = Row<'events'>
export type Ticket = Row<'tickets'>
export type Order = Row<'orders'>
export type Pass = Row<'passes'>
export type Checkin = Row<'checkins'>

// ============================================================================
// Insert Types
// ============================================================================

export type ProfileInsert = Insert<'profiles'>
export type CommunityInsert = Insert<'communities'>
export type CommunityMemberInsert = Insert<'community_members'>
export type EventInsert = Insert<'events'>
export type TicketInsert = Insert<'tickets'>
export type OrderInsert = Insert<'orders'>
export type PassInsert = Insert<'passes'>
export type CheckinInsert = Insert<'checkins'>

// ============================================================================
// Update Types
// ============================================================================

export type ProfileUpdate = Update<'profiles'>
export type CommunityUpdate = Update<'communities'>
export type CommunityMemberUpdate = Update<'community_members'>
export type EventUpdate = Update<'events'>
export type TicketUpdate = Update<'tickets'>
export type OrderUpdate = Update<'orders'>
export type PassUpdate = Update<'passes'>
export type CheckinUpdate = Update<'checkins'>

// ============================================================================
// Enum Types
// ============================================================================

export type EventStatus = Enum<'event_status'>
export type MemberRole = Enum<'member_role'>
export type TicketStatus = Enum<'ticket_status'>
export type OrderStatus = Enum<'order_status'>
export type PaymentProvider = Enum<'payment_provider'>
export type PassStatus = Enum<'pass_status'>

// ============================================================================
// Opaque Types for Special Database Types
// ============================================================================

/**
 * Opaque type for PostgreSQL tsvector (full text search)
 * Should only be handled by server-side code or RPCs
 */
export type Tsvector = unknown & { readonly __brand: 'tsvector' }

/**
 * Opaque type for PostGIS geography points
 * Should only be handled by server-side code or RPCs
 */
export type GeographyPoint = unknown & { readonly __brand: 'geography_point' }

// ============================================================================
// Narrowed Types with Opaque Fields
// ============================================================================

/**
 * Event with properly typed special fields
 */
export type EventWithGeo = Event & {
  search_tsv: Tsvector | null
  venue_geo: GeographyPoint | null
}

/**
 * Community with properly typed search field
 */
export type CommunityWithSearch = Community & {
  search_tsv: Tsvector | null
}

// ============================================================================
// Relation Types (for nested queries)
// ============================================================================

/**
 * Event with community relation
 */
export type EventWithCommunity = Event & {
  community: Community
}

/**
 * Event with creator profile
 */
export type EventWithCreator = Event & {
  creator: Profile | null
}

/**
 * Event with full relations
 */
export type EventWithRelations = Event & {
  community: Community
  creator: Profile | null
}

/**
 * Ticket with event relation
 */
export type TicketWithEvent = Ticket & {
  event: Event
}

/**
 * Order with buyer profile
 */
export type OrderWithBuyer = Order & {
  buyer: Profile
}

/**
 * Community member with user profile
 */
export type MemberWithProfile = CommunityMember & {
  profile: Profile
}

// ============================================================================
// RPC Function Types
// ============================================================================

/**
 * Parameters for purchase_ticket RPC
 */
export type PurchaseTicketParams = {
  p_event_id: string
  p_user_id: string
  p_amount: number
  p_currency?: string
  p_provider?: PaymentProvider
  p_metadata?: Record<string, unknown>
}

/**
 * Parameters for process_checkin RPC
 */
export type ProcessCheckinParams = {
  p_secure_code: string
  p_scanned_by?: string | null
  p_metadata?: Record<string, unknown>
}

/**
 * Parameters for get_event_stats RPC
 */
export type GetEventStatsParams = {
  p_event_id: string
}

/**
 * Response type for get_event_stats RPC
 */
export type EventStats = {
  total_tickets: number
  checked_in: number
  pending: number
  revenue: number
  attendance_rate: number
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract table names as a union type
 */
export type TableName = keyof Database['public']['Tables']

/**
 * Extract enum names as a union type
 */
export type EnumName = keyof Database['public']['Enums']

/**
 * Extract function names as a union type
 */
export type FunctionName = keyof Database['public']['Functions']

/**
 * Make specific fields optional in a type
 */
export type PartialFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Make specific fields required in a type
 */
export type RequiredFields<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a valid event status
 */
export function isEventStatus(value: unknown): value is EventStatus {
  return typeof value === 'string' && 
    ['draft', 'published', 'cancelled', 'completed'].includes(value)
}

/**
 * Check if a value is a valid member role
 */
export function isMemberRole(value: unknown): value is MemberRole {
  return typeof value === 'string' && 
    ['member', 'moderator', 'admin'].includes(value)
}

/**
 * Check if a value is a valid ticket status
 */
export function isTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === 'string' && 
    ['pending', 'confirmed', 'cancelled', 'refunded', 'checked_in'].includes(value)
}

/**
 * Check if a value is a valid order status
 */
export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && 
    ['pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled'].includes(value)
}

/**
 * Check if a value is a valid payment provider
 */
export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return typeof value === 'string' && 
    ['stripe', 'iyzico', 'paypal', 'manual'].includes(value)
}

/**
 * Check if a value is a valid pass status
 */
export function isPassStatus(value: unknown): value is PassStatus {
  return typeof value === 'string' && 
    ['valid', 'used', 'revoked', 'expired'].includes(value)
}