import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({
        communities: 0,
        events: 0,
        tickets: 0,
        revenue: 0,
        recentActivities: [],
        upcomingEvents: []
      });
    }

    // Fetch user's memberships
    const { data: memberships } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', user.id);

    // Fetch communities where user is organizer
    const { data: ownedCommunities } = await supabase
      .from('communities')
      .select('id')
      .eq('organizer_id', user.id);

    // Combine community IDs
    const memberCommunityIds = memberships?.map(m => m.community_id) || [];
    const ownedCommunityIds = ownedCommunities?.map(c => c.id) || [];
    const communityIds = [...new Set([...memberCommunityIds, ...ownedCommunityIds])];

    // Fetch events for user's communities
    let eventsCount = 0;
    let upcomingEvents = [];
    
    if (communityIds.length > 0) {
      const { count, data: events } = await supabase
        .from('events')
        .select('*', { count: 'exact' })
        .in('community_id', communityIds)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(5);
      
      eventsCount = count || 0;
      upcomingEvents = events || [];
    }

    // Fetch user's tickets
    const { count: ticketsCount, data: tickets } = await supabase
      .from('tickets')
      .select('*, events(price)', { count: 'exact' })
      .eq('user_id', user.id);

    // Calculate revenue (if user is an organizer)
    let totalRevenue = 0;
    if (ownedCommunityIds.length > 0) {
      const { data: organizerEvents } = await supabase
        .from('events')
        .select('id, price')
        .in('community_id', ownedCommunityIds);

      if (organizerEvents && organizerEvents.length > 0) {
        const eventIds = organizerEvents.map(e => e.id);
        const { count: soldTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact' })
          .in('event_id', eventIds);

        // Calculate revenue from sold tickets
        for (const event of organizerEvents) {
          const { count } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);
          
          totalRevenue += (count || 0) * (event.price || 0);
        }
      }
    }

    // Fetch recent activities
    const recentActivities = [];
    
    // Get recent community joins
    if (communityIds.length > 0) {
      const { data: recentMembers } = await supabase
        .from('community_members')
        .select(`
          created_at,
          user_id,
          community_id,
          profiles(name, email),
          communities(name)
        `)
        .in('community_id', communityIds)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentMembers) {
        recentMembers.forEach(member => {
          recentActivities.push({
            type: 'member_joined',
            user: member.profiles?.name || member.profiles?.email || 'Unknown User',
            community: member.communities?.name || 'Unknown Community',
            timestamp: member.created_at
          });
        });
      }
    }

    // Get recent ticket purchases
    if (communityIds.length > 0) {
      const { data: recentTickets } = await supabase
        .from('tickets')
        .select(`
          created_at,
          user_id,
          profiles(name, email),
          events(title, community_id)
        `)
        .in('events.community_id', communityIds)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentTickets) {
        recentTickets.forEach(ticket => {
          recentActivities.push({
            type: 'ticket_purchased',
            user: ticket.profiles?.name || ticket.profiles?.email || 'Unknown User',
            event: ticket.events?.title || 'Unknown Event',
            timestamp: ticket.created_at
          });
        });
      }
    }

    // Sort activities by timestamp
    recentActivities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      communities: communityIds.length,
      events: eventsCount,
      tickets: ticketsCount || 0,
      revenue: totalRevenue,
      recentActivities: recentActivities.slice(0, 10),
      upcomingEvents
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}