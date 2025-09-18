"use client";

/**
 * Ticket configuration step - Simplified UX
 * Either FREE or PAID - that's it!
 */

import { useState, useEffect } from "react";
import { Ticket, DollarSign, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { TicketConfigurationTabs } from "@/components/events/TicketConfigurationTabs";
import { TicketTierList } from "@/components/tickets/TicketTierList";
import { DiscountCodeList } from "@/components/tickets/DiscountCodeList";
import { PriceCalculator } from "@/components/tickets/PriceCalculator";
import type { Currency } from "@/lib/types/tickets";

interface TicketTiersStepProps {
  eventId?: string;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

type EventPricing = "free" | "paid";

export default function TicketTiersStep({
  eventId,
  data = {},
  onChange,
}: TicketTiersStepProps) {
  // Determine initial pricing type based on existing data
  const getInitialPricingType = (): EventPricing => {
    const hasTicketing = data?.metadata?.enable_ticketing === true ||
                        data?.enable_ticketing === true;
    return hasTicketing ? "paid" : "free";
  };

  const [pricingType, setPricingType] = useState<EventPricing>(getInitialPricingType());
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(
    (data?.metadata?.ticket_currency as Currency) ||
    (data?.ticket_currency as Currency) ||
    "USD"
  );

  useEffect(() => {
    const initialType = getInitialPricingType();
    setPricingType(initialType);

    const currency = (data?.metadata?.ticket_currency as Currency) ||
                    (data?.ticket_currency as Currency) ||
                    "USD";
    setSelectedCurrency(currency);
  }, [data]);

  const handlePricingTypeChange = (value: EventPricing) => {
    setPricingType(value);

    // Update the data based on pricing type
    const updatedData = {
      ...data,
      enable_ticketing: value === "paid",
      ticket_currency: value === "paid" ? selectedCurrency : null,
      metadata: {
        ...(data.metadata as object || {}),
        enable_ticketing: value === "paid",
        ticket_currency: value === "paid" ? selectedCurrency : null,
      }
    };

    onChange(updatedData);
  };

  const handleCurrencyChange = (currency: Currency) => {
    setSelectedCurrency(currency);
    if (pricingType === "paid") {
      onChange({
        ...data,
        ticket_currency: currency,
        metadata: {
          ...(data.metadata as object || {}),
          ticket_currency: currency,
          enable_ticketing: true
        }
      });
    }
  };

  // For new events (no eventId yet)
  if (!eventId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event Type</CardTitle>
          <CardDescription>
            Is this a free or paid event?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={pricingType} onValueChange={handlePricingTypeChange}>
            <div className="space-y-4">
              {/* Free Event Option */}
              <label className="flex items-start space-x-3 cursor-pointer p-4 rounded-lg border-2 hover:bg-accent/50 transition-colors data-[state=checked]:border-primary">
                <RadioGroupItem value="free" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Free Event</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    No payment required. Perfect for community meetups, workshops, and open events.
                  </p>
                </div>
              </label>

              {/* Paid Event Option */}
              <label className="flex items-start space-x-3 cursor-pointer p-4 rounded-lg border-2 hover:bg-accent/50 transition-colors data-[state=checked]:border-primary">
                <RadioGroupItem value="paid" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Paid Event</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sell tickets with different pricing tiers. Ideal for conferences, premium workshops, and exclusive events.
                  </p>
                </div>
              </label>
            </div>
          </RadioGroup>

          {/* Show currency and ticket configuration for paid events */}
          {pricingType === "paid" && (
            <div className="space-y-6 pt-4 border-t">
              <div>
                <Label htmlFor="currency" className="text-sm font-medium">
                  Event Currency
                </Label>
                <select
                  id="currency"
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedCurrency}
                  onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="TRY">TRY - Turkish Lira</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  This currency will be used for all ticket prices
                </p>
              </div>

              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <Ticket className="h-4 w-4" />
                <AlertDescription>
                  <strong>Next steps:</strong> After creating your event, you can add multiple ticket tiers with different prices, early bird discounts, and limited quantities.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Info for free events */}
          {pricingType === "free" && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <Users className="h-4 w-4" />
              <AlertDescription>
                <strong>Free event selected:</strong> Community members can join without any payment. You can still track attendance and set capacity limits.
              </AlertDescription>
            </Alert>
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
          <CardTitle>Event Pricing</CardTitle>
          <CardDescription>
            Manage your event type and ticket configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={pricingType} onValueChange={handlePricingTypeChange} className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start space-x-3 cursor-pointer p-4 rounded-lg border-2 hover:bg-accent/50 transition-colors data-[state=checked]:border-primary">
                <RadioGroupItem value="free" id="free" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="free" className="font-medium cursor-pointer">
                    Free Event
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    No tickets or payment required
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer p-4 rounded-lg border-2 hover:bg-accent/50 transition-colors data-[state=checked]:border-primary">
                <RadioGroupItem value="paid" id="paid" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="paid" className="font-medium cursor-pointer">
                    Paid Event
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sell tickets with multiple pricing tiers
                  </p>
                </div>
              </label>
            </div>
          </RadioGroup>

          {pricingType === "paid" && (
            <>
              <div className="mb-6">
                <Label htmlFor="currency-edit" className="text-sm font-medium">
                  Event Currency
                </Label>
                <select
                  id="currency-edit"
                  className="mt-2 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
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

              <Tabs defaultValue="tiers" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="tiers">Ticket Tiers</TabsTrigger>
                  <TabsTrigger value="discounts">Discount Codes</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
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
                        Preview how your tickets will appear to attendees
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
            </>
          )}

          {pricingType === "free" && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <Users className="h-4 w-4" />
              <AlertDescription>
                This is a <strong>free event</strong>. Community members can join without any payment.
                You can still manage capacity limits in the event settings.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}