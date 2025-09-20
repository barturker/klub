"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowUp, ArrowDown, UserPlus, Info, Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  calculateUpgradeModification,
  calculateDowngradeModification,
  formatModificationPricing,
  validateOrderModification,
  type TicketTier,
  type ModificationPricing,
} from "@/lib/refund-calculator";

const modificationTypes = [
  { value: "upgrade", label: "Upgrade Ticket", icon: ArrowUp },
  { value: "downgrade", label: "Downgrade Ticket", icon: ArrowDown },
  { value: "transfer", label: "Transfer Ticket", icon: UserPlus },
] as const;

const modificationSchema = z.object({
  type: z.enum(["upgrade", "downgrade", "transfer"]),
  new_ticket_tier_id: z.string().optional(),
  new_quantity: z.number().optional(),
  transfer_to_email: z.string().email().optional(),
  reason: z.string().min(1, "Please provide a reason"),
});

type ModificationFormValues = z.infer<typeof modificationSchema>;

interface OrderModificationFormProps {
  open: boolean;
  onClose: () => void;
  order: any; // Use proper order type
  onModify: (modification: ModificationFormValues) => void;
  isProcessing?: boolean;
  availableTiers?: Array<{
    id: string;
    name: string;
    price_cents: number;
    available_quantity: number;
  }>;
}

export function OrderModificationForm({
  open,
  onClose,
  order,
  onModify,
  isProcessing = false,
  availableTiers = [],
}: OrderModificationFormProps) {
  const [modificationType, setModificationType] = useState<
    "upgrade" | "downgrade" | "transfer"
  >("upgrade");

  const form = useForm<ModificationFormValues>({
    resolver: zodResolver(modificationSchema),
    defaultValues: {
      type: "upgrade",
      reason: "",
    },
  });

  const handleSubmit = (values: ModificationFormValues) => {
    onModify({ ...values, type: modificationType });
  };

  const currentTicketTier = order.tickets?.[0]?.tier;
  const currentPrice = currentTicketTier?.price_cents || 0;

  // Convert to TicketTier format for calculations
  const currentTierData: TicketTier = {
    id: currentTicketTier?.id || "",
    name: currentTicketTier?.name || "",
    price_cents: currentPrice,
  };

  const getFilteredTiers = () => {
    if (modificationType === "upgrade") {
      return availableTiers.filter((tier) => tier.price_cents > currentPrice);
    }
    if (modificationType === "downgrade") {
      return availableTiers.filter((tier) => tier.price_cents < currentPrice);
    }
    return availableTiers;
  };

  const selectedTier = availableTiers.find(
    (tier) => tier.id === form.watch("new_ticket_tier_id")
  );

  // Calculate precise pricing using Dinero.js
  let modificationPricing: ModificationPricing | null = null;
  let pricingFormatted: ReturnType<typeof formatModificationPricing> | null = null;

  if (selectedTier) {
    const selectedTierData: TicketTier = {
      id: selectedTier.id,
      name: selectedTier.name,
      price_cents: selectedTier.price_cents,
      max_quantity: selectedTier.available_quantity,
    };

    if (modificationType === "upgrade") {
      modificationPricing = calculateUpgradeModification(currentTierData, selectedTierData);
    } else if (modificationType === "downgrade") {
      modificationPricing = calculateDowngradeModification(currentTierData, selectedTierData);
    }

    if (modificationPricing) {
      pricingFormatted = formatModificationPricing(modificationPricing);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modify Order</DialogTitle>
          <DialogDescription>
            Modify order #{order.order_number}. Current ticket: {currentTicketTier?.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Modification Type */}
            <div className="space-y-3">
              <Label>Modification Type</Label>
              <RadioGroup
                value={modificationType}
                onValueChange={(value: any) => {
                  setModificationType(value);
                  form.setValue("type", value);
                  // Reset tier selection when type changes
                  form.setValue("new_ticket_tier_id", undefined);
                }}
              >
                {modificationTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div
                      key={type.value}
                      className="flex items-center space-x-3 rounded-lg border p-3"
                    >
                      <RadioGroupItem value={type.value} id={type.value} />
                      <Label
                        htmlFor={type.value}
                        className="flex flex-1 cursor-pointer items-center"
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {type.label}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Upgrade/Downgrade Options */}
            {(modificationType === "upgrade" || modificationType === "downgrade") && (
              <>
                <FormField
                  control={form.control}
                  name="new_ticket_tier_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select New Tier</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a ticket tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getFilteredTiers().map((tier) => (
                            <SelectItem
                              key={tier.id}
                              value={tier.id}
                              disabled={tier.available_quantity === 0}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{tier.name}</span>
                                <span className="ml-2 text-sm text-gray-500">
                                  {formatCurrency(tier.price_cents)}
                                  {tier.available_quantity === 0 && " (Sold Out)"}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {modificationType === "upgrade"
                          ? "Select a higher tier ticket"
                          : "Select a lower tier ticket"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedTier && modificationPricing && pricingFormatted && (
                  <Alert>
                    <Calculator className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="font-medium">Price Breakdown:</div>

                        {/* Current vs New Ticket Prices */}
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Current ticket price:</span>
                            <span>{formatCurrency(modificationPricing.oldTicketPrice)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Current platform fee:</span>
                            <span>{formatCurrency(modificationPricing.oldPlatformFee)}</span>
                          </div>
                          <div className="flex justify-between font-medium border-t pt-1">
                            <span>Current total:</span>
                            <span>{pricingFormatted.oldTotalFormatted}</span>
                          </div>
                        </div>

                        {/* Arrow Indicator */}
                        <div className="text-center text-gray-400">
                          {pricingFormatted.isUpgrade ? "↓ Upgrading to" : "↓ Downgrading to"}
                        </div>

                        {/* New Pricing */}
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>New ticket price:</span>
                            <span>{formatCurrency(modificationPricing.newTicketPrice)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>New platform fee:</span>
                            <span>{formatCurrency(modificationPricing.newPlatformFee)}</span>
                          </div>
                          <div className="flex justify-between font-medium border-t pt-1">
                            <span>New total:</span>
                            <span>{pricingFormatted.newTotalFormatted}</span>
                          </div>
                        </div>

                        {/* Price Difference */}
                        <div className={`border-t pt-2 font-semibold ${
                          pricingFormatted.isUpgrade ? "text-red-600" : "text-green-600"
                        }`}>
                          {pricingFormatted.isUpgrade ? "Additional charge: " : "Refund amount: "}
                          {pricingFormatted.priceDifferenceFormatted}
                        </div>

                        {/* Additional Stripe Fee Notice */}
                        {modificationPricing.additionalStripeFee > 0 && (
                          <div className="text-xs text-gray-500 border-t pt-1">
                            Processing fee: {formatCurrency(modificationPricing.additionalStripeFee)}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {/* Transfer Options */}
            {modificationType === "transfer" && (
              <FormField
                control={form.control}
                name="transfer_to_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transfer To (Email)</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="recipient@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the email address of the person receiving the ticket
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Modification</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explain why this modification is being made..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be logged for record-keeping
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Processing Fee Notice */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Modifications may be subject to processing fees. The customer will
                be notified of any price changes.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isProcessing ||
                  ((modificationType === "upgrade" || modificationType === "downgrade") &&
                    !form.watch("new_ticket_tier_id")) ||
                  (modificationType === "transfer" && !form.watch("transfer_to_email"))
                }
              >
                {isProcessing ? "Processing..." : "Apply Modification"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}