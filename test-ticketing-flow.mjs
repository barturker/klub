// Test script for ticketing flow
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

async function testTicketingFlow() {
  console.log('🔍 Testing Event Ticketing Flow\n');
  console.log('='.repeat(60) + '\n');

  // Test 1: Fetch an existing event
  console.log('📋 Test 1: Fetching an existing event...');
  try {
    // You'll need to replace this with an actual event ID/slug from your database
    const eventSlug = 'test-event'; // Replace with actual event slug
    const response = await fetch(`${API_BASE}/events/${eventSlug}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Event fetched successfully');
      console.log('   Event ID:', data.event?.id);
      console.log('   Event Title:', data.event?.title);
      console.log('   Metadata:', JSON.stringify(data.event?.metadata, null, 2));
      console.log('   Enable Ticketing:', data.event?.metadata?.enable_ticketing);
      console.log('   Ticket Currency:', data.event?.metadata?.ticket_currency);
    } else {
      console.log('❌ Failed to fetch event:', response.status, response.statusText);
      const error = await response.text();
      console.log('   Error:', error);
    }
  } catch (error) {
    console.log('❌ Error fetching event:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 2: Update event with ticketing enabled
  console.log('📝 Test 2: Updating event with ticketing enabled...');
  console.log('   Note: This test requires authentication.');
  console.log('   Please test the update flow through the UI.');

  console.log('\n' + '='.repeat(60) + '\n');
  console.log('📌 Summary:');
  console.log('   1. Check the browser console for debug logs');
  console.log('   2. Try editing an event and enabling ticketing');
  console.log('   3. Save the event and refresh the page');
  console.log('   4. The ticketing checkbox should maintain its state');
  console.log('\n✨ End of tests');
}

testTicketingFlow().catch(console.error);