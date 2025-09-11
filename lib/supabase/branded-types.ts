/**
 * Branded types for extra type safety
 * Prevents mixing up IDs and values of the same primitive type
 */

// ============================================================================
// Brand Type Utility
// ============================================================================

type Brand<T, B> = T & { readonly __brand: B }

// ============================================================================
// ID Types (prevent mixing up different entity IDs)
// ============================================================================

export type ProfileId = Brand<string, 'ProfileId'>
export type CommunityId = Brand<string, 'CommunityId'>
export type EventId = Brand<string, 'EventId'>
export type TicketId = Brand<string, 'TicketId'>
export type OrderId = Brand<string, 'OrderId'>
export type PassId = Brand<string, 'PassId'>
export type CheckinId = Brand<string, 'CheckinId'>
export type UserId = ProfileId // Alias for auth.uid()

// ============================================================================
// Money Types (prevent mixing cents with dollars)
// ============================================================================

export type Cents = Brand<number, 'Cents'>
export type Dollars = Brand<number, 'Dollars'>

// ============================================================================
// Other Branded Types
// ============================================================================

export type SecureCode = Brand<string, 'SecureCode'>
export type Slug = Brand<string, 'Slug'>
export type Email = Brand<string, 'Email'>
export type ISODateTime = Brand<string, 'ISODateTime'>
export type TsVector = Brand<unknown, 'TsVector'>
export type GeographyPoint = Brand<unknown, 'GeographyPoint'>

// ============================================================================
// Type Guards
// ============================================================================

export function isProfileId(value: string): value is ProfileId {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function isCommunityId(value: string): value is CommunityId {
  return isProfileId(value) // Same UUID format
}

export function isEventId(value: string): value is EventId {
  return isProfileId(value) // Same UUID format
}

export function isEmail(value: string): value is Email {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isSlug(value: string): value is Slug {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

export function isISODateTime(value: string): value is ISODateTime {
  const date = new Date(value)
  return !isNaN(date.getTime()) && value.includes('T')
}

// ============================================================================
// Conversion Functions
// ============================================================================

export function toProfileId(id: string): ProfileId {
  if (!isProfileId(id)) {
    throw new Error(`Invalid ProfileId: ${id}`)
  }
  return id as ProfileId
}

export function toCommunityId(id: string): CommunityId {
  if (!isCommunityId(id)) {
    throw new Error(`Invalid CommunityId: ${id}`)
  }
  return id as CommunityId
}

export function toEventId(id: string): EventId {
  if (!isEventId(id)) {
    throw new Error(`Invalid EventId: ${id}`)
  }
  return id as EventId
}

export function toTicketId(id: string): TicketId {
  if (!isProfileId(id)) {
    throw new Error(`Invalid TicketId: ${id}`)
  }
  return id as TicketId
}

export function toOrderId(id: string): OrderId {
  if (!isProfileId(id)) {
    throw new Error(`Invalid OrderId: ${id}`)
  }
  return id as OrderId
}

export function toPassId(id: string): PassId {
  if (!isProfileId(id)) {
    throw new Error(`Invalid PassId: ${id}`)
  }
  return id as PassId
}

export function toCheckinId(id: string): CheckinId {
  if (!isProfileId(id)) {
    throw new Error(`Invalid CheckinId: ${id}`)
  }
  return id as CheckinId
}

export function toCents(dollars: number): Cents {
  return Math.round(dollars * 100) as Cents
}

export function toDollars(cents: Cents): Dollars {
  return (cents / 100) as Dollars
}

export function toSlug(text: string): Slug {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  
  if (!isSlug(slug)) {
    throw new Error(`Cannot convert to valid slug: ${text}`)
  }
  
  return slug as Slug
}

export function toEmail(email: string): Email {
  const normalized = email.toLowerCase().trim()
  
  if (!isEmail(normalized)) {
    throw new Error(`Invalid email: ${email}`)
  }
  
  return normalized as Email
}

export function toISODateTime(date: Date | string): ISODateTime {
  const isoString = typeof date === 'string' ? date : date.toISOString()
  
  if (!isISODateTime(isoString)) {
    throw new Error(`Invalid ISO date time: ${date}`)
  }
  
  return isoString as ISODateTime
}

export function toSecureCode(code: string): SecureCode {
  if (code.length < 10) {
    throw new Error('Secure code must be at least 10 characters')
  }
  return code as SecureCode
}

// ============================================================================
// Exhaustiveness Check
// ============================================================================

/**
 * Helper for exhaustive switch statements
 * Ensures all enum cases are handled at compile time
 * 
 * @example
 * switch (status) {
 *   case 'draft': return handleDraft()
 *   case 'published': return handlePublished()
 *   case 'cancelled': return handleCancelled()
 *   case 'completed': return handleCompleted()
 *   default: return assertNever(status)
 * }
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${JSON.stringify(value)}`)
}

// ============================================================================
// Usage Examples
// ============================================================================

/*
// Prevent mixing up IDs
function transferTicket(ticketId: TicketId, toUserId: ProfileId) {
  // Type safe - can't accidentally pass EventId here
}

// Money safety
function createOrder(amount: Cents) {
  // Can't accidentally pass dollar amount
}

// Convert user input
const eventId = toEventId(req.params.id) // Validates and brands
const amount = toCents(25.99) // $25.99 → 2599 cents

// Exhaustive enum handling
import { Enums } from './database.types'

function getStatusColor(status: Enums<'event_status'>): string {
  switch (status) {
    case 'draft': return 'gray'
    case 'published': return 'green'
    case 'cancelled': return 'red'
    case 'completed': return 'blue'
    default: return assertNever(status) // Compile error if enum changes
  }
}
*/