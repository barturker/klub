/**
 * Advanced type utilities for Supabase database types
 * Provides better type safety and ergonomics
 */

import { createClient } from '@supabase/supabase-js'
import type { Database, Tables, Enums, Json } from './database.types'

// ============================================================================
// Supabase Client with Types
// ============================================================================

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ============================================================================
// Opaque Types for Special Database Fields
// ============================================================================

export type OpaqueTsVector = unknown & { __brand: 'tsvector' }
export type OpaqueGeography = unknown & { __brand: 'geography' }

// Helper to add opaque types to table rows
export type WithTsv<T> = Omit<T, 'search_tsv'> & { 
  search_tsv: OpaqueTsVector | null 
}

export type WithGeo<T> = Omit<T, 'venue_geo'> & { 
  venue_geo: OpaqueGeography | null 
}

// Properly typed rows with opaque fields
export type EventRow = WithTsv<WithGeo<Tables<'events'>>>
export type CommunityRow = WithTsv<Tables<'communities'>>

// ============================================================================
// JSON Type Helpers
// ============================================================================

export type JsonObject = Exclude<Json, string | number | boolean | null | Json[]>
export type JsonArray = Json[]
export type JsonPrimitive = string | number | boolean | null

// Type guard for JSON object
export function isJsonObject(value: Json): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// Type guard for JSON array
export function isJsonArray(value: Json): value is JsonArray {
  return Array.isArray(value)
}

// Safe JSON cast
export function asJson<T extends Json>(json: T): T {
  return json
}

// ============================================================================
// RPC Helper with Full Type Safety
// ============================================================================

export async function rpc<T extends keyof Database['public']['Functions']>(
  functionName: T,
  args: Database['public']['Functions'][T]['Args']
): Promise<Database['public']['Functions'][T]['Returns']> {
  const { data, error } = await supabase.rpc(functionName as string, args)
  
  if (error) throw error
  return data as Database['public']['Functions'][T]['Returns']
}

// Typed RPC wrappers for common operations
export async function purchaseTicket(params: {
  eventId: string
  userId: string
  amount: number
  currency?: string
  provider?: Enums<'payment_provider'>
  metadata?: JsonObject
}) {
  return rpc('purchase_ticket', {
    p_event_id: params.eventId,
    p_user_id: params.userId,
    p_amount: params.amount,
    p_currency: params.currency,
    p_provider: params.provider,
    p_metadata: params.metadata
  })
}

export async function generatePass(ticketId: string) {
  return rpc('generate_pass_for_ticket', { 
    p_ticket_id: ticketId 
  })
}

export async function processCheckIn(
  secureCode: string, 
  scannedBy?: string,
  metadata?: JsonObject
) {
  return rpc('process_checkin', { 
    p_secure_code: secureCode,
    p_scanned_by: scannedBy,
    p_metadata: metadata
  })
}

export async function getEventStats(eventId: string) {
  return rpc('get_event_stats', { 
    p_event_id: eventId 
  })
}

// ============================================================================
// Pre-built Select Queries for Common Patterns
// ============================================================================

// Event with all relations
export const selectEventWithRelations = `
  *,
  community:communities!events_community_id_fkey (
    id, name, slug, avatar_url
  ),
  creator:profiles!events_created_by_fk (
    id, full_name, username, avatar_url
  )
` as const

// Ticket with event and pass
export const selectTicketWithDetails = `
  *,
  pass:passes!passes_ticket_id_fkey (*),
  event:events!tickets_event_id_fkey (
    id, title, start_at, end_at, venue_name, venue_address
  )
` as const

// Order with buyer and event
export const selectOrderWithDetails = `
  *,
  event:events!orders_event_id_fkey (
    id, title, start_at
  ),
  buyer:profiles!orders_buyer_fk (
    id, full_name, username, email
  )
` as const

// Community member with profile
export const selectMemberWithProfile = `
  *,
  profile:profiles!community_members_user_id_fkey (
    id, full_name, username, avatar_url
  )
` as const

// ============================================================================
// Composite Application Types
// ============================================================================

// User's ticket view
export type MyTicket = Tables<'tickets'> & {
  pass?: Tables<'passes'> | null
  event?: Pick<Tables<'events'>, 'id' | 'title' | 'start_at' | 'end_at' | 'venue_name' | 'venue_address'>
}

// Organizer's order view
export type OrganizerOrder = Tables<'orders'> & {
  buyer?: Pick<Tables<'profiles'>, 'id' | 'full_name' | 'username' | 'email'>
  event?: Pick<Tables<'events'>, 'id' | 'title'>
}

// Event with full details
export type EventWithRelations = Tables<'events'> & {
  community: Pick<Tables<'communities'>, 'id' | 'name' | 'slug' | 'avatar_url'>
  creator?: Pick<Tables<'profiles'>, 'id' | 'full_name' | 'username' | 'avatar_url'> | null
}

// Community member with user info
export type MemberWithProfile = Tables<'community_members'> & {
  profile: Pick<Tables<'profiles'>, 'id' | 'full_name' | 'username' | 'avatar_url'>
}

// ============================================================================
// Query Helpers
// ============================================================================

// Fetch current user's tickets
export async function getMyTickets(userId: string) {
  const { data, error } = await supabase
    .from('tickets')
    .select(selectTicketWithDetails)
    .eq('user_id', userId)
    .order('purchased_at', { ascending: false })
  
  if (error) throw error
  return data as MyTicket[]
}

// Fetch orders for an event (organizer view)
export async function getEventOrders(eventId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(selectOrderWithDetails)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as OrganizerOrder[]
}

// Search events using full-text search
export async function searchEvents(query: string, limit = 25) {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, start_at, end_at, venue_name, price_cents')
    .textSearch('search_tsv', query, { type: 'plain' })
    .eq('status', 'published')
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(limit)
  
  if (error) throw error
  return data
}

// Get upcoming events for a community
export async function getCommunityEvents(
  communityId: string, 
  status: Enums<'event_status'> = 'published'
) {
  const { data, error } = await supabase
    .from('events')
    .select(selectEventWithRelations)
    .eq('community_id', communityId)
    .eq('status', status)
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })
  
  if (error) throw error
  return data as EventWithRelations[]
}

// ============================================================================
// Type Guards
// ============================================================================

export function isValidEventStatus(value: unknown): value is Enums<'event_status'> {
  return typeof value === 'string' && 
    ['draft', 'published', 'cancelled', 'completed'].includes(value)
}

export function isValidTicketStatus(value: unknown): value is Enums<'ticket_status'> {
  return typeof value === 'string' && 
    ['pending', 'confirmed', 'cancelled', 'refunded', 'checked_in'].includes(value)
}

export function isValidOrderStatus(value: unknown): value is Enums<'order_status'> {
  return typeof value === 'string' && 
    ['pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled'].includes(value)
}

export function isValidPassStatus(value: unknown): value is Enums<'pass_status'> {
  return typeof value === 'string' && 
    ['valid', 'used', 'revoked', 'expired'].includes(value)
}

export function isValidMemberRole(value: unknown): value is Enums<'member_role'> {
  return typeof value === 'string' && 
    ['member', 'moderator', 'admin'].includes(value)
}

export function isValidPaymentProvider(value: unknown): value is Enums<'payment_provider'> {
  return typeof value === 'string' && 
    ['stripe', 'iyzico', 'paypal', 'manual'].includes(value)
}