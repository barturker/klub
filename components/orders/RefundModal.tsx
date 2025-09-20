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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, DollarSign, Info, Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  calculateOrderBreakdown,
  calculateRefundBreakdown,
  validateRefundAmount,
  formatRefundAmount,
  type OrderBreakdown,
  type RefundBreakdown,
} from "@/lib/refund-calculator";

const refundReasons = [
  { value: "requested_by_customer", label: "Customer Request" },
  { value: "duplicate", label: "Duplicate Order" },
  { value: "fraudulent", label: "Fraudulent Transaction" },
  { value: "event_cancelled", label: "Event Cancelled" },
  { value: "other", label: "Other" },
] as const;

const refundSchema = z.object({
  amount_cents: z.number().min(1, "Amount must be greater than 0"),
  reason: z.enum([
    "requested_by_customer",
    "duplicate",
    "fraudulent",
    "event_cancelled",
    "other",
  ]),
  reason_details: z.string().optional(),
  notify_customer: z.boolean().default(true),
});

type RefundFormValues = z.infer<typeof refundSchema>;

interface RefundModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  maxAmount: number;
  ticketPrice: number; // base ticket price in cents
  platformFee: number; // platform fee in cents
  alreadyRefunded?: number; // amount already refunded in cents
  onRefund: (amount: number, reason: string, reasonDetails?: string, notify?: boolean) => void;
  isProcessing?: boolean;
}

export function RefundModal({
  open,
  onClose,
  orderId,
  maxAmount,
  ticketPrice,
  platformFee,
  alreadyRefunded = 0,
  onRefund,
  isProcessing = false,
}: RefundModalProps) {
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [customAmount, setCustomAmount] = useState("");

  // Calculate order breakdown
  const orderBreakdown = calculateOrderBreakdown(ticketPrice);

  // Calculate current refund breakdown
  const currentRefundAmount = refundType === "full"
    ? maxAmount
    : parseInt(customAmount || "0") * 100;

  const refundBreakdown = calculateRefundBreakdown(
    orderBreakdown,
    currentRefundAmount,
    refundType === "full"
  );

  const form = useForm<RefundFormValues>({
    resolver: zodResolver(refundSchema),
    defaultValues: {
      amount_cents: maxAmount,
      reason: "requested_by_customer",
      reason_details: "",
      notify_customer: true,
    },
  });

  const handleSubmit = (values: RefundFormValues) => {
    // Use the calculated total refund amount from the breakdown
    const amount = refundBreakdown.totalRefund;
    onRefund(amount, values.reason, values.reason_details, values.notify_customer);
  };

  const handleAmountChange = (value: string) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^0-9.]/g, "");

    // Ensure only one decimal point
    const parts = numericValue.split(".");
    const formatted = parts[0] + (parts[1] !== undefined ? "." + parts[1].slice(0, 2) : "");

    setCustomAmount(formatted);

    // Update form value in cents
    const cents = Math.round(parseFloat(formatted || "0") * 100);
    form.setValue("amount_cents", cents);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
          <DialogDescription>
            Process a refund for order #{orderId}. Maximum refundable amount:{" "}
            {formatCurrency(maxAmount)}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Refund Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Refund Type</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={refundType === "full" ? "default" : "outline"}
                  onClick={() => {
                    setRefundType("full");
                    form.setValue("amount_cents", maxAmount);
                  }}
                  className="w-full"
                >
                  Full Refund
                  <span className="ml-2 text-xs">
                    ({formatCurrency(maxAmount)})
                  </span>
                </Button>
                <Button
                  type="button"
                  variant={refundType === "partial" ? "default" : "outline"}
                  onClick={() => setRefundType("partial")}
                  className="w-full"
                >
                  Partial Refund
                </Button>
              </div>
            </div>

            {/* Partial Amount */}
            {refundType === "partial" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Refund Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="0.00"
                    value={customAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {customAmount && (() => {
                  const validation = validateRefundAmount(
                    orderBreakdown,
                    parseFloat(customAmount) * 100,
                    alreadyRefunded
                  );
                  return !validation.isValid && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {validation.error}
                      </AlertDescription>
                    </Alert>
                  );
                })()}
              </div>
            )}

            {/* Refund Breakdown */}
            {(refundType === "full" || (refundType === "partial" && customAmount && parseFloat(customAmount) > 0)) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-gray-500" />
                  <label className="text-sm font-medium">Refund Breakdown</label>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Ticket Refund:</span>
                    <span className="font-medium">
                      {formatRefundAmount(refundBreakdown.ticketRefund)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Platform Fee Refund:</span>
                    <span className="font-medium">
                      {formatRefundAmount(refundBreakdown.platformFeeRefund)}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                    <span>Total Refund:</span>
                    <span className="text-green-600">
                      {formatRefundAmount(refundBreakdown.totalRefund)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Organizer will be charged: {formatRefundAmount(refundBreakdown.organzerImpact)}
                  </div>
                </div>
              </div>
            )}

            {/* Refund Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Refund Reason</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {refundReasons.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Additional Details */}
            <FormField
              control={form.control}
              name="reason_details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Details (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide any additional context for this refund..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This information will be logged for record-keeping purposes.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notify Customer */}
            <FormField
              control={form.control}
              name="notify_customer"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Send notification to customer</FormLabel>
                    <FormDescription>
                      Customer will receive an email confirmation of the refund
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Warning Message */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Refunds typically process within 5-10 business days. The refunded
                amount will be returned to the original payment method.
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
                  (refundType === "partial" && (() => {
                    if (!customAmount) return true;
                    const validation = validateRefundAmount(
                      orderBreakdown,
                      parseFloat(customAmount) * 100,
                      alreadyRefunded
                    );
                    return !validation.isValid;
                  })())
                }
              >
                {isProcessing ? "Processing..." : "Process Refund"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}