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
import { Separator } from "@/components/ui/separator";

import { TicketConfigurationTabs } from "@/components/events/TicketConfigurationTabs";
import { TicketTierList } from "@/components/tickets/TicketTierList";
import { DiscountCodeList } from "@/components/tickets/DiscountCodeList";
import { PriceCalculator } from "@/components/tickets/PriceCalculator";
import type { Currency } from "@/lib/types/tickets";

interface TicketTiersStepProps {
  eventId?: string; // Will be available after the event is created
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

export default function TicketTiersStep({
  eventId,
  data = {},
  onChange,
}: TicketTiersStepProps) {
  const [enableTicketing, setEnableTicketing] = useState(
    (data?.enable_ticketing as boolean) || false
  );
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(
    (data?.ticket_currency as Currency) || "USD"
  );

  const handleToggleTicketing = (enabled: boolean) => {
    setEnableTicketing(enabled);
    onChange({
      ...data,
      enable_ticketing: enabled,
      ticket_currency: enabled ? selectedCurrency : null,
    });
  };

  const handleCurrencyChange = (currency: Currency) => {
    setSelectedCurrency(currency);
    if (enableTicketing) {
      onChange({
        ...data,
        ticket_currency: currency,
      });
    }
  };

  // If event hasn't been created yet (for new events)
  if (!eventId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket Configuration (Optional)</CardTitle>
          <CardDescription>
            Set up ticket tiers, discount codes, and pricing for your event. You can skip this step if tickets are not required.
          </CardDescription>
        </CardHeader>
        <CardContent>

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
            <div className="mt-4 space-y-6">
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

              <Separator />

              {/* Full Ticket Configuration with Tabs for new events */}
              <TicketConfigurationTabs
                currency={selectedCurrency}
                data={data}
                onChange={onChange}
              />
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