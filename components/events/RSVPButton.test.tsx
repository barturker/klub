// Manual test helper for RSVP functionality
// This component can be used to test RSVP actions

import { RSVPButton } from './RSVPButton';

export function RSVPButtonTest() {
  // Test with a sample free event
  const testEventId = 'c623677f-7606-48d1-a793-ae6219750c6d'; // From your console logs
  const testEventSlug = 'tickett';
  const testCommunitySlug = 'ahmetciler';
  const testCapacity = 100; // Example capacity
  const testStartAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Future date

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">RSVP Button Test</h2>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Test Configuration:</h3>
          <ul className="text-sm text-muted-foreground">
            <li>Event ID: {testEventId}</li>
            <li>Event Slug: {testEventSlug}</li>
            <li>Community Slug: {testCommunitySlug}</li>
            <li>Capacity: {testCapacity}</li>
            <li>Start Date: {new Date(testStartAt).toLocaleString()}</li>
          </ul>
        </div>

        <div className="border rounded-lg p-4">
          <RSVPButton
            eventId={testEventId}
            eventSlug={testEventSlug}
            communitySlug={testCommunitySlug}
            capacity={testCapacity}
            startAt={testStartAt}
          />
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Open browser console to see debug logs</p>
          <p>Try clicking the RSVP button and selecting different options</p>
        </div>
      </div>
    </div>
  );
}