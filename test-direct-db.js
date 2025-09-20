// Direct database test to see what orders exist
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uchbiaeauxadjsjnjmjf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaGJpYWVhdXhhZGpzam5qbWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTE4OTQsImV4cCI6MjA3MzE2Nzg5NH0.Ody4L9HG9D4st-FwqmI0x_PytdTjNx08LziCcxSkGpk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkOrders() {
  console.log('\n🔍 [DEBUG] CHECKING ALL ORDERS IN DATABASE\n');
  console.log('================================');

  // 1. Get ALL orders
  console.log('\n📋 [DEBUG] Fetching ALL orders...');
  const { data: allOrders, error: allError } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (allError) {
    console.error('❌ [DEBUG] Error fetching all orders:', allError);
  } else {
    console.log(`✅ [DEBUG] Total orders found: ${allOrders?.length || 0}`);

    // Group by status
    const statusGroups = {};
    allOrders?.forEach(order => {
      if (!statusGroups[order.status]) {
        statusGroups[order.status] = [];
      }
      statusGroups[order.status].push(order);
    });

    console.log('\n📊 [DEBUG] Orders by status:');
    Object.entries(statusGroups).forEach(([status, orders]) => {
      console.log(`   ${status}: ${orders.length} orders`);
    });

    // Show details of pending orders
    if (statusGroups.pending) {
      console.log('\n🔶 [DEBUG] PENDING ORDERS DETAILS:');
      statusGroups.pending.forEach((order, idx) => {
        console.log(`\n   Order ${idx + 1}:`);
        console.log(`   - ID: ${order.id}`);
        console.log(`   - Order Number: ${order.order_number}`);
        console.log(`   - Amount: $${(order.amount_cents / 100).toFixed(2)}`);
        console.log(`   - Email: ${order.buyer_email}`);
        console.log(`   - Created: ${order.created_at}`);
        console.log(`   - Event ID: ${order.event_id}`);
        console.log(`   - Stripe Session ID: ${order.metadata?.stripe_session_id || order.stripe_session_id || 'none'}`);
      });
    }

    // Show details of paid orders
    if (statusGroups.paid) {
      console.log('\n✅ [DEBUG] PAID ORDERS DETAILS:');
      statusGroups.paid.forEach((order, idx) => {
        console.log(`\n   Order ${idx + 1}:`);
        console.log(`   - ID: ${order.id}`);
        console.log(`   - Order Number: ${order.order_number}`);
        console.log(`   - Amount: $${(order.amount_cents / 100).toFixed(2)}`);
        console.log(`   - Paid At: ${order.paid_at}`);
      });
    }
  }

  // 2. Check specific community orders
  console.log('\n🏢 [DEBUG] Checking ZIMBADS community orders...');
  const communityId = '425ed2b0-f1fb-49a0-97b0-08da0d3901b0';

  // First get events for this community
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id')
    .eq('community_id', communityId);

  if (eventsError) {
    console.error('❌ [DEBUG] Error fetching events:', eventsError);
  } else {
    console.log(`✅ [DEBUG] Found ${events?.length || 0} events for community`);

    if (events && events.length > 0) {
      const eventIds = events.map(e => e.id);

      const { data: communityOrders, error: communityError } = await supabase
        .from('orders')
        .select('*')
        .in('event_id', eventIds)
        .order('created_at', { ascending: false });

      if (communityError) {
        console.error('❌ [DEBUG] Error fetching community orders:', communityError);
      } else {
        console.log(`✅ [DEBUG] Community orders found: ${communityOrders?.length || 0}`);

        const communityStatusGroups = {};
        communityOrders?.forEach(order => {
          if (!communityStatusGroups[order.status]) {
            communityStatusGroups[order.status] = [];
          }
          communityStatusGroups[order.status].push(order);
        });

        console.log('\n📊 [DEBUG] Community orders by status:');
        Object.entries(communityStatusGroups).forEach(([status, orders]) => {
          console.log(`   ${status}: ${orders.length} orders`);
        });
      }
    }
  }

  // 3. Check tickets
  console.log('\n🎫 [DEBUG] Checking tickets...');
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (ticketsError) {
    console.error('❌ [DEBUG] Error fetching tickets:', ticketsError);
  } else {
    console.log(`✅ [DEBUG] Tickets found: ${tickets?.length || 0}`);
    if (tickets && tickets.length > 0) {
      tickets.forEach((ticket, idx) => {
        console.log(`   Ticket ${idx + 1}: ${ticket.ticket_number} (Order: ${ticket.order_id?.slice(0, 8)}...)`);
      });
    }
  }

  console.log('\n================================');
  console.log('📝 [DEBUG] DATABASE CHECK COMPLETE');
  console.log('================================\n');
}

checkOrders().catch(console.error);