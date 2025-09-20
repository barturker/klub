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
import { ArrowUp, ArrowDown, UserPlus, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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
  const priceDifference = selectedTier
    ? selectedTier.price_cents - currentPrice
    : 0;

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

                {selectedTier && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <div className="font-medium">Price Difference:</div>
                        <div className="flex justify-between">
                          <span>Current: {formatCurrency(currentPrice)}</span>
                          <span>New: {formatCurrency(selectedTier.price_cents)}</span>
                        </div>
                        <div className="border-t pt-1 font-semibold">
                          {priceDifference > 0 ? "Additional charge: " : "Refund amount: "}
                          {formatCurrency(Math.abs(priceDifference))}
                        </div>
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