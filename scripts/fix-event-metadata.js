#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixEventMetadata() {
  try {
    const eventId = '97415404-7c76-4134-89bc-f99c88b7af1c';

    console.log('Fixing event metadata...');

    // Get current metadata
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('metadata')
      .eq('id', eventId)
      .single();

    if (fetchError) throw fetchError;

    console.log('Current metadata:', event.metadata);

    // Update with correct metadata
    const { error } = await supabase
      .from('events')
      .update({
        metadata: {
          is_free: true,
          ticket_currency: 'USD',
          enable_ticketing: false,
          attendee_list_visible: true
        }
      })
      .eq('id', eventId);

    if (error) throw error;

    console.log('✅ Event metadata fixed!');
    console.log('New metadata: { is_free: true, ticket_currency: "USD", enable_ticketing: false, attendee_list_visible: true }');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixEventMetadata();