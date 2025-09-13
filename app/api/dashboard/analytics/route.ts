import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({
        revenueData: [],
        communityGrowth: [],
        eventCategories: []
      });
    }

    // Get user's communities
    const { data: memberships } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', user.id);

    const { data: ownedCommunities } = await supabase
      .from('communities')
      .select('id')
      .eq('organizer_id', user.id);

    const communityIds = [...new Set([
      ...(memberships?.map(m => m.community_id) || []),
      ...(ownedCommunities?.map(c => c.id) || [])
    ])];

    // Initialize response data
    const analyticsData = {
      revenueData: [],
      communityGrowth: [],
      eventCategories: []
    };

    if (communityIds.length === 0) {
      return NextResponse.json(analyticsData);
    }

    // Fetch revenue data for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: events } = await supabase
      .from('events')
      .select('id, date, price, community_id')
      .in('community_id', communityIds)
      .gte('date', sixMonthsAgo.toISOString())
      .order('date', { ascending: true });

    // Calculate monthly revenue
    const monthlyRevenue = new Map();
    const monthlyTickets = new Map();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (events && events.length > 0) {
      const eventIds = events.map(e => e.id);
      
      const { data: tickets } = await supabase
        .from('tickets')
        .select('event_id, created_at')
        .in('event_id', eventIds);

      if (tickets) {
        tickets.forEach(ticket => {
          const event = events.find(e => e.id === ticket.event_id);
          if (event) {
            const date = new Date(ticket.created_at);
            const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
            
            const currentRevenue = monthlyRevenue.get(monthKey) || 0;
            monthlyRevenue.set(monthKey, currentRevenue + (event.price || 0));
            
            const currentTickets = monthlyTickets.get(monthKey) || 0;
            monthlyTickets.set(monthKey, currentTickets + 1);
          }
        });
      }
    }

    // Format revenue data for the last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
      const shortMonth = months[date.getMonth()].substring(0, 3);
      
      analyticsData.revenueData.push({
        month: shortMonth,
        revenue: monthlyRevenue.get(monthKey) || 0,
        tickets: monthlyTickets.get(monthKey) || 0
      });
    }

    // Fetch community growth data (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: memberJoins } = await supabase
      .from('community_members')
      .select('created_at')
      .in('community_id', communityIds)
      .gte('created_at', sevenDaysAgo.toISOString());

    // Calculate daily member growth
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dailyGrowth = new Map();
    
    if (memberJoins) {
      memberJoins.forEach(join => {
        const date = new Date(join.created_at);
        const dayIndex = date.getDay();
        const dayName = days[dayIndex === 0 ? 6 : dayIndex - 1]; // Adjust for Sunday
        
        const current = dailyGrowth.get(dayName) || 0;
        dailyGrowth.set(dayName, current + 1);
      });
    }

    // Get total members for baseline
    const { count: totalMembers } = await supabase
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .in('community_id', communityIds);

    let cumulativeMembers = (totalMembers || 0) - (memberJoins?.length || 0);
    days.forEach(day => {
      const growth = dailyGrowth.get(day) || 0;
      cumulativeMembers += growth;
      analyticsData.communityGrowth.push({
        day,
        members: cumulativeMembers
      });
    });

    // Fetch event categories
    const { data: allEvents } = await supabase
      .from('events')
      .select('category')
      .in('community_id', communityIds);

    if (allEvents && allEvents.length > 0) {
      const categoryCounts = new Map();
      
      allEvents.forEach(event => {
        const category = event.category || 'Other';
        const current = categoryCounts.get(category) || 0;
        categoryCounts.set(category, current + 1);
      });

      const categoryColors = {
        'Music': '#8b5cf6',
        'Sports': '#ec4899',
        'Tech': '#3b82f6',
        'Art': '#10b981',
        'Education': '#f59e0b',
        'Social': '#ef4444',
        'Other': '#6b7280'
      };

      categoryCounts.forEach((value, name) => {
        analyticsData.eventCategories.push({
          name,
          value,
          color: categoryColors[name] || '#6b7280'
        });
      });
    }

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}