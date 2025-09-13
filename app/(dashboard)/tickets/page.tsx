'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconTicket } from '@tabler/icons-react';

export default function TicketsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
        <p className="text-muted-foreground mt-2">
          Manage your event tickets
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Ticketing feature is being developed
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <IconTicket className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">
            The ticketing feature will be available soon. Stay tuned!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}