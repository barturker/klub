'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconCalendarEvent } from '@tabler/icons-react';

export default function EventsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Events</h1>
        <p className="text-muted-foreground mt-2">
          Discover and manage your events
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Events feature is being developed
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <IconCalendarEvent className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">
            The events feature will be available soon. Stay tuned!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}