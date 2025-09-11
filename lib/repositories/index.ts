/**
 * Repository Pattern for clean data access
 * Single entry point for all database operations
 */

import { supabase } from '@/lib/supabase/type-utils'
import { 
  parseOrThrow,
  eventCreateSchema,
  eventUpdateSchema,
  orderCreateSchema,
  ticketCreateSchema,
  communityCreateSchema,
  communityUpdateSchema
} from '@/lib/supabase/validation'
import {
  type EventId,
  type CommunityId,
  type ProfileId,
  type TicketId,
  type OrderId,
  type Cents,
  toEventId,
  toCommunityId,
  toProfileId,
  toTicketId,
  toOrderId,
  assertNever
} from '@/lib/supabase/branded-types'
import type { Enums, Tables } from '@/lib/supabase/database.types'

// ============================================================================
// Events Repository
// ============================================================================

export const eventsRepo = {
  /**
   * Get published events with pagination
   */
  async getPublished(limit = 25, offset = 0) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        community:communities!events_community_id_fkey (
          id, name, slug, avatar_url
        )
      `)
      .eq('status', 'published')
      .gte('start_at', new Date().toISOString())
      .order('start_at', { ascending: true })
      .range(offset, offset + limit - 1)
    
    if (error) throw error
    return data
  },

  /**
   * Get single event by ID
   */
  async getById(id: EventId) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        community:communities!events_community_id_fkey (*),
        creator:profiles!events_created_by_fk (*)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Get events for a community
   */
  async getByCommunity(communityId: CommunityId, status?: Enums<'event_status'>) {
    let query = supabase
      .from('events')
      .select('*')
      .eq('community_id', communityId)
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query.order('start_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  /**
   * Create new event
   */
  async create(input: unknown) {
    const validated = parseOrThrow(eventCreateSchema, input)
    
    const { data, error } = await supabase
      .from('events')
      .insert(validated)
      .select()
      .single()
    
    if (error) throw error
    return { id: toEventId(data.id), ...data }
  },

  /**
   * Update event
   */
  async update(id: EventId, input: unknown) {
    const validated = parseOrThrow(eventUpdateSchema, input)
    
    const { data, error } = await supabase
      .from('events')
      .update(validated)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Search events using full-text search
   */
  async search(query: string, limit = 25) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .textSearch('search_tsv', query, { type: 'plain' })
      .eq('status', 'published')
      .limit(limit)
    
    if (error) throw error
    return data
  },

  /**
   * Get event statistics
   */
  async getStats(id: EventId) {
    const { data, error } = await supabase
      .rpc('get_event_stats', { p_event_id: id })
    
    if (error) throw error
    return data as {
      total_tickets: number
      checked_in: number
      pending: number
      revenue: number
      attendance_rate: number
    }
  }
}

// ============================================================================
// Communities Repository
// ============================================================================

export const communitiesRepo = {
  /**
   * Get all public communities
   */
  async getPublic(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('is_public', true)
      .order('member_count', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) throw error
    return data
  },

  /**
   * Get community by slug
   */
  async getBySlug(slug: string) {
    const { data, error } = await supabase
      .from('communities')
      .select(`
        *,
        organizer:profiles!communities_organizer_id_fkey (
          id, full_name, username, avatar_url
        )
      `)
      .eq('slug', slug)
      .single()
    
    if (error) throw error
    return { id: toCommunityId(data.id), ...data }
  },

  /**
   * Get community members
   */
  async getMembers(communityId: CommunityId) {
    const { data, error } = await supabase
      .from('community_members')
      .select(`
        *,
        profile:profiles!community_members_user_id_fkey (*)
      `)
      .eq('community_id', communityId)
      .order('joined_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  /**
   * Create community
   */
  async create(input: unknown) {
    const validated = parseOrThrow(communityCreateSchema, input)
    
    const { data, error } = await supabase
      .from('communities')
      .insert(validated)
      .select()
      .single()
    
    if (error) throw error
    return { id: toCommunityId(data.id), ...data }
  },

  /**
   * Join community
   */
  async join(communityId: CommunityId, userId: ProfileId, role: Enums<'member_role'> = 'member') {
    const { data, error } = await supabase
      .from('community_members')
      .insert({
        community_id: communityId,
        user_id: userId,
        role
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Search communities
   */
  async search(query: string, limit = 25) {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .textSearch('search_tsv', query, { type: 'plain' })
      .eq('is_public', true)
      .limit(limit)
    
    if (error) throw error
    return data
  }
}

// ============================================================================
// Tickets Repository
// ============================================================================

export const ticketsRepo = {
  /**
   * Get user's tickets
   */
  async getMyTickets(userId: ProfileId) {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        event:events!tickets_event_id_fkey (
          id, title, start_at, end_at, venue_name, venue_address
        ),
        pass:passes!passes_ticket_id_fkey (*)
      `)
      .eq('user_id', userId)
      .order('purchased_at', { ascending: false })
    
    if (error) throw error
    return data.map(t => ({ ...t, id: toTicketId(t.id) }))
  },

  /**
   * Get tickets for event (organizer view)
   */
  async getByEvent(eventId: EventId) {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        user:profiles!tickets_user_id_fkey (
          id, full_name, username, email
        ),
        pass:passes!passes_ticket_id_fkey (*)
      `)
      .eq('event_id', eventId)
      .order('purchased_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  /**
   * Purchase ticket (via RPC)
   */
  async purchase(eventId: EventId, userId: ProfileId, amount: Cents) {
    const { data, error } = await supabase
      .rpc('purchase_ticket', {
        p_event_id: eventId,
        p_user_id: userId,
        p_amount: amount,
        p_currency: 'USD'
      })
    
    if (error) throw error
    return toTicketId(data)
  },

  /**
   * Generate pass for ticket (via RPC)
   */
  async generatePass(ticketId: TicketId) {
    const { data, error } = await supabase
      .rpc('generate_pass_for_ticket', {
        p_ticket_id: ticketId
      })
    
    if (error) throw error
    return data
  }
}

// ============================================================================
// Orders Repository
// ============================================================================

export const ordersRepo = {
  /**
   * Get user's orders
   */
  async getMyOrders(userId: ProfileId) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        event:events!orders_event_id_fkey (
          id, title, start_at
        )
      `)
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data.map(o => ({ ...o, id: toOrderId(o.id) }))
  },

  /**
   * Get orders for event (organizer view)
   */
  async getByEvent(eventId: EventId) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        buyer:profiles!orders_buyer_fk (
          id, full_name, username, email
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  /**
   * Create order
   */
  async create(input: unknown) {
    const validated = parseOrThrow(orderCreateSchema, input)
    
    const { data, error } = await supabase
      .from('orders')
      .insert(validated)
      .select()
      .single()
    
    if (error) throw error
    return { id: toOrderId(data.id), ...data }
  },

  /**
   * Update order status
   */
  async updateStatus(orderId: OrderId, status: Enums<'order_status'>) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// ============================================================================
// Check-ins Repository
// ============================================================================

export const checkinsRepo = {
  /**
   * Process check-in (via RPC)
   */
  async processCheckin(secureCode: string, scannedBy: ProfileId) {
    const { data, error } = await supabase
      .rpc('process_checkin', {
        p_secure_code: secureCode,
        p_scanned_by: scannedBy
      })
    
    if (error) {
      if (error.message.includes('already checked in')) {
        return { success: false, reason: 'already_checked_in' }
      }
      if (error.message.includes('not found')) {
        return { success: false, reason: 'invalid_code' }
      }
      throw error
    }
    
    return { success: true, data }
  },

  /**
   * Get check-ins for event
   */
  async getByEvent(eventId: EventId) {
    const { data, error } = await supabase
      .from('checkins')
      .select(`
        *,
        ticket:tickets!checkins_ticket_id_fkey (
          id,
          user:profiles!tickets_user_id_fkey (
            id, full_name, username
          )
        ),
        scanner:profiles!checkins_scanned_by_fk (
          id, full_name, username
        )
      `)
      .eq('ticket.event_id', eventId)
      .order('scanned_at', { ascending: false })
    
    if (error) throw error
    return data
  }
}

// ============================================================================
// Export all repositories
// ============================================================================

export const db = {
  events: eventsRepo,
  communities: communitiesRepo,
  tickets: ticketsRepo,
  orders: ordersRepo,
  checkins: checkinsRepo
}

// Default export for convenience
export default db