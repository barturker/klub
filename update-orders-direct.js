// Direct update using service role key
const { createClient } = require('@supabase/supabase-js');

// Use the actual Supabase URL from your env
const supabaseUrl = 'https://uchbiaeauxadjsjnjmjf.supabase.co';

// We need the service role key - let me check if it's available
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function updateOrders() {
  console.log('\n🔧 [FIX] UPDATING PENDING ORDERS TO PAID\n');
  console.log('================================');

  // Try with anon key first to see what we can access
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaGJpYWVhdXhhZGpzam5qbWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTE4OTQsImV4cCI6MjA3MzE2Nzg5NH0.Ody4L9HG9D4st-FwqmI0x_PytdTjNx08LziCcxSkGpk';

  const supabase = createClient(supabaseUrl, anonKey);

  // First, let's check what tables exist
  console.log('📊 [FIX] Checking database structure...');

  // Try to get community ID first
  const communitySlug = 'zimbads';
  const { data: community } = await supabase
    .from('communities')
    .select('id')
    .eq('slug', communitySlug)
    .single();

  if (!community) {
    console.error('❌ [FIX] Community not found');
    return;
  }

  console.log(`✅ [FIX] Found community: ${community.id}`);

  // Get events for this community
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, title')
    .eq('community_id', community.id);

  if (eventsError) {
    console.error('❌ [FIX] Error fetching events:', eventsError);
    return;
  }

  console.log(`✅ [FIX] Found ${events?.length || 0} events`);

  if (!events || events.length === 0) {
    console.log('⚠️ [FIX] No events found for this community');
    return;
  }

  const eventIds = events.map(e => e.id);

  // Now get orders for these events
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .in('event_id', eventIds)
    .eq('status', 'pending');

  if (ordersError) {
    console.error('❌ [FIX] Error fetching orders:', ordersError);
    return;
  }

  console.log(`\n📦 [FIX] Found ${orders?.length || 0} pending orders`);

  if (!orders || orders.length === 0) {
    console.log('✅ [FIX] No pending orders to update');
    return;
  }

  // Update each order
  console.log('\n🔄 [FIX] Updating orders...\n');

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    console.log(`   Updating order ${i + 1}/${orders.length}: ${order.order_number}`);

    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: 'card',
        metadata: {
          ...order.metadata,
          manually_updated: true,
          updated_at: new Date().toISOString(),
          updated_reason: 'fix_pending_orders'
        }
      })
      .eq('id', order.id)
      .select()
      .single();

    if (updateError) {
      console.error(`   ❌ Failed to update order ${order.order_number}:`, updateError.message);
    } else {
      console.log(`   ✅ Order ${order.order_number} updated to PAID`);

      // Generate ticket
      const ticketCode = `TKT${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`.toUpperCase();

      const { error: ticketError } = await supabase
        .from('tickets')
        .insert({
          order_id: order.id,
          event_id: order.event_id,
          user_id: order.buyer_id,
          ticket_number: ticketCode,
          status: 'active',
          purchase_date: new Date().toISOString(),
          qr_code: ticketCode,
          metadata: {
            manually_created: true
          }
        });

      if (ticketError) {
        console.error(`   ⚠️ Failed to create ticket:`, ticketError.message);
      } else {
        console.log(`   🎫 Ticket created: ${ticketCode}`);
      }
    }
  }

  // Final check
  const { data: finalCheck } = await supabase
    .from('orders')
    .select('status')
    .in('event_id', eventIds);

  const statusCounts = {};
  finalCheck?.forEach(o => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });

  console.log('\n📊 [FIX] Final order status counts:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });

  console.log('\n================================');
  console.log('✅ [FIX] UPDATE PROCESS COMPLETE');
  console.log('================================\n');
}

updateOrders().catch(console.error);