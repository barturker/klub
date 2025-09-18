// Test script to update event metadata
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateEventMetadata() {
  const eventId = 'c623677f-7606-48d1-a793-ae6219750c6d'; // Your TICKETT event

  // First, get current event
  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (fetchError) {
    console.error('Error fetching event:', fetchError);
    return;
  }

  console.log('Current event metadata:', event.metadata);

  // Update metadata with ticketing info
  const { data: updated, error: updateError } = await supabase
    .from('events')
    .update({
      metadata: {
        ...event.metadata,
        enable_ticketing: true,
        ticket_currency: 'USD'
      }
    })
    .eq('id', eventId)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating metadata:', updateError);
    return;
  }

  console.log('Updated event metadata:', updated.metadata);
}

updateEventMetadata();