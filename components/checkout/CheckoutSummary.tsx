"use client";

import { formatAmountForDisplay } from "@/lib/stripe/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Ticket, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CheckoutSummaryProps {
  eventName: string;
  eventDate?: string;
  eventLocation?: string;
  ticketTierName: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
  platformFeeCents?: number;
  stripeFeeCents?: number;
  totalFeeCents?: number;
  totalAmountCents: number;
  discountCents?: number;
  currency?: string;
}

export function CheckoutSummary({
  eventName,
  eventDate,
  eventLocation,
  ticketTierName,
  quantity,
  unitPriceCents,
  subtotalCents,
  platformFeeCents = 0,
  stripeFeeCents = 0,
  totalFeeCents = 0,
  totalAmountCents,
  discountCents = 0,
  currency = "USD",
}: CheckoutSummaryProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
        <CardDescription>Review your purchase details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event Details */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{eventName}</h3>
          {eventDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>{formatDate(eventDate)}</span>
            </div>
          )}
          {eventLocation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{eventLocation}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Ticket Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{ticketTierName}</span>
            </div>
            <Badge variant="secondary">{quantity} ticket{quantity > 1 ? "s" : ""}</Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price per ticket</span>
              <span>{formatAmountForDisplay(unitPriceCents, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity</span>
              <span>× {quantity}</span>
            </div>
            {discountCents > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatAmountForDisplay(discountCents, currency)}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Fee Breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatAmountForDisplay(subtotalCents, currency)}</span>
          </div>

          {totalFeeCents > 0 && (
            <div className="flex justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Service fees</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-1 text-xs">
                        {platformFeeCents > 0 && (
                          <div className="flex justify-between gap-4">
                            <span>Platform fee (3%):</span>
                            <span>{formatAmountForDisplay(platformFeeCents, currency)}</span>
                          </div>
                        )}
                        {stripeFeeCents > 0 && (
                          <div className="flex justify-between gap-4">
                            <span>Payment processing (2.9% + 30¢):</span>
                            <span>{formatAmountForDisplay(stripeFeeCents, currency)}</span>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span>{formatAmountForDisplay(totalFeeCents, currency)}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-lg font-bold">
            {formatAmountForDisplay(totalAmountCents, currency)}
          </span>
        </div>

        {/* Security Badge */}
        <div className="pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Secure payment powered by Stripe</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}