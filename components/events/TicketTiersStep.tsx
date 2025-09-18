"use client";

/**
 * Ticket configuration step in event wizard
 */

import { useState } from "react";
import { Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { TicketTierList } from "@/components/tickets/TicketTierList";
import { DiscountCodeList } from "@/components/tickets/DiscountCodeList";
import { PriceCalculator } from "@/components/tickets/PriceCalculator";
import type { Currency } from "@/lib/types/tickets";

interface TicketTiersStepProps {
  eventId?: string; // Will be available after the event is created
  eventData: Record<string, unknown>;
  updateEventData: (data: Record<string, unknown>) => void;
  validationErrors?: Record<string, string>;
  clearValidationErrors?: () => void;
}

export default function TicketTiersStep({
  eventId,
  eventData,
  updateEventData,
}: TicketTiersStepProps) {
  const [enableTicketing, setEnableTicketing] = useState(
    eventData.enable_ticketing || false
  );
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(
    eventData.ticket_currency || "USD"
  );

  const handleToggleTicketing = (enabled: boolean) => {
    setEnableTicketing(enabled);
    updateEventData({
      ...eventData,
      enable_ticketing: enabled,
      ticket_currency: enabled ? selectedCurrency : null,
    });
  };

  const handleCurrencyChange = (currency: Currency) => {
    setSelectedCurrency(currency);
    if (enableTicketing) {
      updateEventData({
        ...eventData,
        ticket_currency: currency,
      });
    }
  };

  // If event hasn't been created yet (for new events)
  if (!eventId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket Configuration</CardTitle>
          <CardDescription>
            Ticket configuration will be available after the event is created.
            You can configure tickets later from the event management page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Complete the event creation process first. You&apos;ll be able to add ticket tiers,
              set pricing, and create discount codes from the event management dashboard.
            </AlertDescription>
          </Alert>

          <div className="mt-6 flex items-center space-x-2">
            <Switch
              id="enable-ticketing"
              checked={enableTicketing}
              onCheckedChange={handleToggleTicketing}
            />
            <Label htmlFor="enable-ticketing">
              Enable ticketing for this event
            </Label>
          </div>

          {enableTicketing && (
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="currency">Event Currency</Label>
                <select
                  id="currency"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                  value={selectedCurrency}
                  onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="TRY">TRY - Turkish Lira</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                </select>
              </div>

              <Alert>
                <AlertDescription>
                  After creating the event, you&apos;ll be able to:
                  <ul className="mt-2 ml-4 list-disc">
                    <li>Create multiple ticket tiers (Early Bird, General, VIP)</li>
                    <li>Set different prices and availability for each tier</li>
                    <li>Configure sales windows and quantity limits</li>
                    <li>Create discount codes and group pricing</li>
                    <li>Manage refund and transfer policies</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // For existing events (edit mode), show full ticket management
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ticket Configuration</CardTitle>
          <CardDescription>
            Set up ticket tiers, pricing, and discount codes for your event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-6">
            <Switch
              id="enable-ticketing"
              checked={enableTicketing}
              onCheckedChange={handleToggleTicketing}
            />
            <Label htmlFor="enable-ticketing">
              Enable ticketing for this event
            </Label>
          </div>

          {enableTicketing && (
            <Tabs defaultValue="tiers" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tiers">Ticket Tiers</TabsTrigger>
                <TabsTrigger value="discounts">Discount Codes</TabsTrigger>
                <TabsTrigger value="preview">Preview & Test</TabsTrigger>
              </TabsList>

              <TabsContent value="tiers" className="space-y-4">
                <TicketTierList eventId={eventId} canEdit={true} />
              </TabsContent>

              <TabsContent value="discounts" className="space-y-4">
                <DiscountCodeList
                  eventId={eventId}
                  eventCurrency={selectedCurrency}
                  canEdit={true}
                />
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Ticket Purchase Preview</CardTitle>
                    <CardDescription>
                      Test how your ticket configuration will appear to attendees
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PriceCalculator
                      eventId={eventId}
                      eventCurrency={selectedCurrency}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}