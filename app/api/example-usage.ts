/**
 * Example API route showing how to use all the type utilities together
 * This file demonstrates best practices for type-safe Supabase operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  parseOrThrow, 
  safeParse,
  purchaseTicketRequestSchema,
  eventCreateSchema,
  eventSearchRequestSchema 
} from '@/lib/supabase/validation'
import { 
  supabase,
  purchaseTicket,
  searchEvents,
  getCommunityEvents,
  selectEventWithRelations,
  type EventWithRelations
} from '@/lib/supabase/type-utils'

// ============================================================================
// Example 1: Create Event (with validation)
// ============================================================================

export async function createEvent(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input with Zod
    const eventData = parseOrThrow(eventCreateSchema, body)
    
    // Insert with type safety
    const { data, error } = await supabase
      .from('events')
      .insert(eventData)
      .select(selectEventWithRelations)
      .single()
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(data as EventWithRelations)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    )
  }
}

// ============================================================================
// Example 2: Purchase Ticket (using RPC)
// ============================================================================

export async function purchaseTicketEndpoint(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate with safeParse for better error handling
    const validation = safeParse(purchaseTicketRequestSchema, body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.flatten()
        },
        { status: 400 }
      )
    }
    
    // Call typed RPC function
    const ticketId = await purchaseTicket(validation.data)
    
    // Fetch the created ticket with relations
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        event:events!tickets_event_id_fkey (
          id, title, start_at, venue_name
        ),
        pass:passes!passes_ticket_id_fkey (*)
      `)
      .eq('id', ticketId)
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true,
      ticket 
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Purchase failed' },
      { status: 500 }
    )
  }
}

// ============================================================================
// Example 3: Search Events (with full-text search)
// ============================================================================

export async function searchEventsEndpoint(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const params = {
      query: searchParams.get('q') || '',
      limit: parseInt(searchParams.get('limit') || '25'),
      communityId: searchParams.get('communityId') || undefined
    }
    
    // Validate search params
    const validatedParams = parseOrThrow(eventSearchRequestSchema, params)
    
    // Use the typed search function
    const events = await searchEvents(validatedParams.query, validatedParams.limit)
    
    return NextResponse.json({
      results: events,
      count: events.length
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 400 }
    )
  }
}

// ============================================================================
// Example 4: Get My Tickets (with RLS)
// ============================================================================

export async function getMyTicketsEndpoint(request: NextRequest) {
  try {
    // Get user from auth header or session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // RLS will automatically filter to user's tickets
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select(`
        *,
        event:events!tickets_event_id_fkey (
          id, title, start_at, end_at, 
          venue_name, venue_address,
          community:communities!events_community_id_fkey (
            id, name, slug
          )
        ),
        pass:passes!passes_ticket_id_fkey (
          id, secure_code, status
        )
      `)
      .order('purchased_at', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json({
      tickets,
      count: tickets.length
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}

// ============================================================================
// Example 5: Process Check-in (protected RPC)
// ============================================================================

export async function processCheckinEndpoint(request: NextRequest) {
  try {
    const body = await request.json()
    const { secureCode } = body
    
    if (!secureCode || typeof secureCode !== 'string') {
      return NextResponse.json(
        { error: 'Invalid secure code' },
        { status: 400 }
      )
    }
    
    // Get scanner user ID from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Call the RPC (passes/checkins are write-protected, must use RPC)
    const { data, error } = await supabase.rpc('process_checkin', {
      p_secure_code: secureCode,
      p_scanned_by: user.id,
      p_metadata: {
        scanned_at: new Date().toISOString(),
        device: request.headers.get('user-agent') || 'unknown'
      }
    })
    
    if (error) {
      // Handle specific error cases
      if (error.message.includes('already checked in')) {
        return NextResponse.json(
          { error: 'Ticket already checked in' },
          { status: 409 }
        )
      }
      throw error
    }
    
    return NextResponse.json({
      success: true,
      result: data
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Check-in failed' },
      { status: 500 }
    )
  }
}

// ============================================================================
// Example 6: Organizer Dashboard Data
// ============================================================================

export async function getOrganizerStats(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID required' },
        { status: 400 }
      )
    }
    
    // Check if user is event organizer (RLS will handle this)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, created_by')
      .eq('id', eventId)
      .single()
    
    if (eventError) throw eventError
    
    // Get stats using RPC
    const { data: stats, error: statsError } = await supabase
      .rpc('get_event_stats', { p_event_id: eventId })
    
    if (statsError) throw statsError
    
    // Get recent orders (RLS filtered)
    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        buyer:profiles!orders_buyer_fk (
          id, full_name, username, email
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (ordersError) throw ordersError
    
    return NextResponse.json({
      event,
      stats,
      recentOrders
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}