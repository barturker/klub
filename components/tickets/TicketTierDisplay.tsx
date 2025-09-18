"use client";

/**
 * Display ticket tiers for public event view
 * Shows available tickets with pricing, availability, and selection options
 */

import { useState } from "react";
import {
  Ticket,
  Clock,
  AlertCircle,
  ChevronRight,
  Calendar
} from "lucide-react";
import { format, isAfter, isBefore } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { PriceCalculator } from "./PriceCalculator";
import { useTicketTiers } from "@/hooks/useTicketTiers";
import { useCurrency } from "@/hooks/useCurrency";
import type { TicketTier, Currency } from "@/lib/types/tickets";

interface TicketTierDisplayProps {
  eventId: string;
  eventStatus: string;
  eventStartDate: string;
  eventCurrency?: Currency;
  canPurchase?: boolean;
}

export function TicketTierDisplay({
  eventId,
  eventStatus,
  eventStartDate,
  eventCurrency = "USD",
  canPurchase = true,
}: TicketTierDisplayProps) {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const { data: tiers = [], isLoading } = useTicketTiers(eventId);
  const { formatMoney } = useCurrency();

  // Filter only visible and available tiers
  const visibleTiers = tiers.filter(tier => !tier.is_hidden);

  // Check if event is published
  const isPublished = eventStatus === "published";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3 mx-auto"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!visibleTiers.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Ticket className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No tickets available</p>
          <p className="text-sm mt-1">
            {!isPublished
              ? "This event is not yet published"
              : "Check back later for ticket availability"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const getTierStatus = (tier: TicketTier) => {
    const now = new Date();
    const salesStart = tier.sales_start ? new Date(tier.sales_start) : null;
    const salesEnd = tier.sales_end ? new Date(tier.sales_end) : null;

    if (salesStart && isBefore(now, salesStart)) {
      return { status: "upcoming", message: `Sales start ${format(salesStart, "MMM d")}` };
    }

    if (salesEnd && isAfter(now, salesEnd)) {
      return { status: "ended", message: "Sales ended" };
    }

    if (tier.quantity_available && tier.quantity_sold >= tier.quantity_available) {
      return { status: "sold_out", message: "Sold out" };
    }

    if (tier.quantity_available) {
      const remaining = tier.quantity_available - tier.quantity_sold;
      if (remaining <= 10) {
        return { status: "limited", message: `Only ${remaining} left!` };
      }
    }

    return { status: "available", message: "Available" };
  };

  const getAvailabilityPercentage = (tier: TicketTier) => {
    if (!tier.quantity_available) return 0;
    return Math.round((tier.quantity_sold / tier.quantity_available) * 100);
  };

  const handleSelectTier = (tier: TicketTier) => {
    const status = getTierStatus(tier);
    if (status.status !== "available" && status.status !== "limited") {
      return;
    }

    setShowPurchaseModal(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Tickets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleTiers.map((tier) => {
            const tierStatus = getTierStatus(tier);
            const isAvailable = tierStatus.status === "available" || tierStatus.status === "limited";
            const percentage = getAvailabilityPercentage(tier);

            return (
              <div
                key={tier.id}
                className={`border rounded-lg p-4 space-y-3 transition-colors ${
                  isAvailable && canPurchase
                    ? "hover:border-primary cursor-pointer"
                    : "opacity-60"
                }`}
                onClick={() => canPurchase && handleSelectTier(tier)}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{tier.name}</h4>
                    {tier.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {tier.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-xl font-bold">
                      {formatMoney(tier.price_cents, eventCurrency)}
                    </div>
                    <p className="text-xs text-muted-foreground">per ticket</p>
                  </div>
                </div>

                {/* Status badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {tierStatus.status === "sold_out" && (
                    <Badge variant="secondary">Sold Out</Badge>
                  )}
                  {tierStatus.status === "limited" && (
                    <Badge variant="destructive">{tierStatus.message}</Badge>
                  )}
                  {tierStatus.status === "upcoming" && (
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {tierStatus.message}
                    </Badge>
                  )}
                  {tierStatus.status === "ended" && (
                    <Badge variant="secondary">Sales Ended</Badge>
                  )}

                  {/* Quantity limits */}
                  {tier.max_per_order && (
                    <Badge variant="outline" className="text-xs">
                      Max {tier.max_per_order} per order
                    </Badge>
                  )}
                </div>

                {/* Availability progress */}
                {tier.quantity_available && tierStatus.status !== "upcoming" && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{tier.quantity_sold} sold</span>
                      <span>{tier.quantity_available - tier.quantity_sold} available</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )}

                {/* Sales window */}
                {(tier.sales_start || tier.sales_end) && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {tier.sales_start && (
                      <span>From {format(new Date(tier.sales_start), "MMM d")}</span>
                    )}
                    {tier.sales_start && tier.sales_end && <span>-</span>}
                    {tier.sales_end && (
                      <span>Until {format(new Date(tier.sales_end), "MMM d")}</span>
                    )}
                  </div>
                )}

                {/* Select button for mobile */}
                {isAvailable && canPurchase && (
                  <div className="flex justify-end pt-2 sm:hidden">
                    <Button size="sm" variant="outline">
                      Select
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Info message */}
          {!canPurchase && (
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                You must be a community member to purchase tickets
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Modal */}
      <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Tickets</DialogTitle>
            <DialogDescription>
              Choose your tickets and review the total price before proceeding to checkout.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <PriceCalculator
              eventId={eventId}
              eventCurrency={eventCurrency}
              onProceedToCheckout={(total) => {
                // TODO: Implement checkout flow
                console.log("Proceeding to checkout with total:", total);
                setShowPurchaseModal(false);
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurchaseModal(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}