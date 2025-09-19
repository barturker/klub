"use client";

/**
 * Interactive price calculator using Dinero.js for immutable monetary operations
 */

import { useState, useEffect } from "react";
import { Calculator, Tag, Receipt, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { useCurrency } from "@/hooks/useCurrency";
import { usePricingStore } from "@/hooks/usePricingStore";
import {
  useTicketTiers,
  useValidateDiscountCode,
} from "@/hooks/useTicketTiers";
import type { Currency } from "@/lib/types/tickets";

interface PriceCalculatorProps {
  eventId: string;
  eventCurrency?: Currency;
  onProceedToCheckout?: (total: number) => void;
}

export function PriceCalculator({
  eventId,
  eventCurrency = "USD",
  onProceedToCheckout,
}: PriceCalculatorProps) {
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const router = useRouter();

  const { data: tiers = [] } = useTicketTiers(eventId);
  const { formatMoney } = useCurrency();

  const {
    selectedTickets,
    selectTickets,
    discountCode,
    setDiscountCode,
    discountValidation,
    setDiscountValidation,
    subtotal,
    discountAmount,
    fees,
    total,
    setAvailableTiers,
    setCurrency,
  } = usePricingStore();

  // Set available tiers and currency
  useEffect(() => {
    setAvailableTiers(tiers);
    setCurrency(eventCurrency);
  }, [tiers, eventCurrency, setAvailableTiers, setCurrency]);

  // Only validate discount code when explicitly applied
  const { data: codeValidation } = useValidateDiscountCode(
    eventId,
    appliedCode || undefined
  );

  useEffect(() => {
    if (codeValidation && appliedCode) {
      // Handle both array and object responses for safety
      const validationData = Array.isArray(codeValidation) ? codeValidation[0] : codeValidation;


      if (validationData) {
        setDiscountCode(appliedCode);
        setDiscountValidation({
          isValid: validationData.is_valid,
          type: validationData.discount_type,
          value: validationData.discount_value,
          message: validationData.message,
        });
      }
    }
  }, [codeValidation, appliedCode, setDiscountCode, setDiscountValidation]);

  const handleApplyDiscountCode = () => {
    if (!discountCodeInput.trim()) {
      setAppliedCode(null);
      setDiscountCode(null);
      setDiscountValidation(null);
      return;
    }

    const normalizedCode = discountCodeInput.trim().toUpperCase();

    setIsValidatingCode(true);
    setAppliedCode(normalizedCode);

    // Validation will happen via the react-query hook
    setTimeout(() => {
      setIsValidatingCode(false);
    }, 500);
  };

  const handleQuantityChange = (tierId: string, quantity: number) => {
    const tier = tiers.find((t) => t.id === tierId);
    if (!tier) return;

    // Validate quantity against tier limits
    const validQuantity = Math.max(
      0,
      Math.min(quantity, tier.max_per_order)
    );

    selectTickets(tierId, validQuantity, tier);
  };

  const availableForPurchase = tiers.filter((tier) => {
    // Check if tier is hidden
    if (tier.is_hidden) return false;

    // Check sales window
    const now = new Date();
    if (tier.sales_start && new Date(tier.sales_start) > now) return false;
    if (tier.sales_end && new Date(tier.sales_end) < now) return false;

    // Check availability
    if (
      tier.quantity_available !== null &&
      tier.quantity_sold >= tier.quantity_available
    ) {
      return false;
    }

    return true;
  });

  const hasSelections = selectedTickets.size > 0;

  const handleCheckout = async () => {
    if (!hasSelections || total === 0) return;

    setIsProcessingCheckout(true);

    try {
      // Prepare the selected tickets data
      const ticketSelections = Array.from(selectedTickets.entries()).map(
        ([tierId, selection]) => ({
          tierId,
          quantity: selection.quantity,
          subtotal: selection.subtotal,
        })
      );

      // Create Stripe checkout session
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          selectedTickets: ticketSelections,
          discountCode: appliedCode,
          currency: eventCurrency,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to proceed to checkout. Please try again.");
      setIsProcessingCheckout(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Ticket Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ticket Selection */}
        <div className="space-y-4">
          {availableForPurchase.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No tickets available for purchase at this time.
            </p>
          ) : (
            availableForPurchase.map((tier) => {
              const selection = selectedTickets.get(tier.id);
              const remaining =
                tier.quantity_available !== null
                  ? tier.quantity_available - tier.quantity_sold
                  : null;

              return (
                <div
                  key={tier.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{tier.name}</h4>
                      {tier.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {tier.description}
                        </p>
                      )}
                      <p className="mt-2 text-lg font-semibold">
                        {tier.price_cents === 0
                          ? "Free"
                          : formatMoney(tier.price_cents, eventCurrency)}
                      </p>
                      {remaining !== null && (
                        <p className="text-sm text-muted-foreground">
                          {remaining} remaining
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleQuantityChange(
                            tier.id,
                            Math.max(0, (selection?.quantity || 0) - 1)
                          )
                        }
                        disabled={(selection?.quantity || 0) === 0}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        max={tier.max_per_order}
                        value={selection?.quantity || 0}
                        onChange={(e) =>
                          handleQuantityChange(
                            tier.id,
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-16 text-center"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleQuantityChange(
                            tier.id,
                            (selection?.quantity || 0) + 1
                          )
                        }
                        disabled={
                          (selection?.quantity || 0) >= tier.max_per_order ||
                          (remaining !== null &&
                            (selection?.quantity || 0) >= remaining)
                        }
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  {selection && selection.quantity > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t text-sm">
                      <span className="text-muted-foreground">
                        Subtotal ({selection.quantity} tickets)
                      </span>
                      <span className="font-medium">
                        {formatMoney(selection.subtotal, eventCurrency)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Discount Code */}
        {hasSelections && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Discount Code
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter discount code"
                  value={discountCodeInput}
                  onChange={(e) =>
                    setDiscountCodeInput(e.target.value.toUpperCase())
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleApplyDiscountCode();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={handleApplyDiscountCode}
                  disabled={isValidatingCode}
                >
                  {isValidatingCode ? "Checking..." : "Apply"}
                </Button>
              </div>
              {discountValidation && (
                <p
                  className={`text-sm ${
                    discountValidation.isValid
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {discountValidation.message}
                </p>
              )}
            </div>
          </>
        )}

        {/* Price Summary */}
        {hasSelections && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Price Summary
              </h4>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal, eventCurrency)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatMoney(discountAmount, eventCurrency)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Processing Fees</span>
                  <span>{formatMoney(fees, eventCurrency)}</span>
                </div>

                <Separator />

                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(total, eventCurrency)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={onProceedToCheckout ? () => onProceedToCheckout(total) : handleCheckout}
                disabled={isProcessingCheckout || (total === 0 && subtotal > 0)} // Prevent free checkout if originally paid
              >
                {isProcessingCheckout ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Proceed to Checkout"
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}