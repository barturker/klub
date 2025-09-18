"use client";

/**
 * Form to create/edit ticket tier
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { useCreateTicketTier, useUpdateTicketTier } from "@/hooks/useTicketTiers";
import { useCurrency } from "@/hooks/useCurrency";
import type { TicketTier, Currency } from "@/lib/types/tickets";

// Form validation schema
const ticketTierSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  currency: z.enum(["USD", "EUR", "GBP", "TRY", "JPY"] as const),
  quantity_available: z.number().optional().nullable(),
  sales_start: z.date().optional().nullable(),
  sales_end: z.date().optional().nullable(),
  min_per_order: z.number().min(1, "Minimum must be at least 1"),
  max_per_order: z.number().min(1, "Maximum must be at least 1"),
  is_hidden: z.boolean().default(false),
}).refine(
  (data) => !data.max_per_order || data.max_per_order >= data.min_per_order,
  {
    message: "Maximum per order must be greater than or equal to minimum",
    path: ["max_per_order"],
  }
).refine(
  (data) =>
    !data.sales_start ||
    !data.sales_end ||
    data.sales_end > data.sales_start,
  {
    message: "Sales end must be after sales start",
    path: ["sales_end"],
  }
);

type TicketTierFormData = z.infer<typeof ticketTierSchema>;

interface TicketTierFormProps {
  eventId: string;
  tier?: TicketTier;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TicketTierForm({
  eventId,
  tier,
  onSuccess,
  onCancel,
}: TicketTierFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toMinorUnits, toMajorUnits, getCurrencySymbol } = useCurrency();

  const createMutation = useCreateTicketTier();
  const updateMutation = useUpdateTicketTier();

  const form = useForm<TicketTierFormData>({
    resolver: zodResolver(ticketTierSchema),
    defaultValues: tier
      ? {
          name: tier.name,
          description: tier.description || "",
          price: toMajorUnits(tier.price_cents, tier.currency),
          currency: tier.currency,
          quantity_available: tier.quantity_available,
          sales_start: tier.sales_start ? new Date(tier.sales_start) : null,
          sales_end: tier.sales_end ? new Date(tier.sales_end) : null,
          min_per_order: tier.min_per_order,
          max_per_order: tier.max_per_order,
          is_hidden: tier.is_hidden,
        }
      : {
          name: "",
          description: "",
          price: 0,
          currency: "USD" as Currency,
          quantity_available: null,
          sales_start: null,
          sales_end: null,
          min_per_order: 1,
          max_per_order: 10,
          is_hidden: false,
        },
  });

  // Debug form state
  console.log('[DEBUG] Form initialized with defaultValues:', form.getValues());
  console.log('[DEBUG] Form errors:', form.formState.errors);

  const selectedCurrency = form.watch("currency");

  const onSubmit = async (data: TicketTierFormData) => {
    setIsSubmitting(true);

    try {
      const formData = {
        name: data.name,
        description: data.description || null,
        price_cents: toMinorUnits(data.price, data.currency),
        currency: data.currency,
        quantity_available: data.quantity_available || null,
        sales_start: data.sales_start?.toISOString() || null,
        sales_end: data.sales_end?.toISOString() || null,
        min_per_order: data.min_per_order,
        max_per_order: data.max_per_order,
        is_hidden: data.is_hidden,
      };

      if (tier) {
        await updateMutation.mutateAsync({
          tierId: tier.id,
          data: formData,
        });
      } else {
        await createMutation.mutateAsync({
          eventId,
          data: formData,
        });
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error saving ticket tier:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tier Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Early Bird, General Admission, VIP"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The name of this ticket tier that attendees will see
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what's included with this ticket"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => {
              console.log('[DEBUG] Price field props:', field);
              console.log('[DEBUG] Price field value type:', typeof field.value);
              console.log('[DEBUG] Price field value:', field.value);

              return (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {getCurrencySymbol(selectedCurrency)}
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      className="pl-8"
                      name={field.name}
                      ref={field.ref}
                      value={(() => {
                        console.log('[DEBUG] Converting value for display:', field.value);
                        console.log('[DEBUG] Type of field.value:', typeof field.value);

                        if (field.value === undefined || field.value === null) {
                          console.log('[DEBUG] Value is undefined/null, returning empty string');
                          return '';
                        }

                        if (typeof field.value === 'number' && !isNaN(field.value)) {
                          const stringValue = field.value.toString();
                          console.log('[DEBUG] Converted to string:', stringValue);
                          return stringValue;
                        }

                        console.log('[DEBUG] Value is NaN or not a number, returning empty string');
                        return '';
                      })()}
                      onChange={(e) => {
                        console.log('[DEBUG] Price Input onChange triggered');
                        console.log('[DEBUG] Raw input value:', e.target.value);

                        // Replace comma with dot for Turkish locale
                        const inputValue = e.target.value.replace(',', '.');
                        console.log('[DEBUG] After comma replacement:', inputValue);

                        // Allow empty string
                        if (inputValue === '') {
                          console.log('[DEBUG] Empty string detected, setting to 0');
                          field.onChange(0);
                          return;
                        }

                        // Only allow numbers and single decimal point
                        console.log('[DEBUG] Regex test result:', /^\d*\.?\d*$/.test(inputValue));
                        if (/^\d*\.?\d*$/.test(inputValue)) {
                          // Special handling for strings like "." or numbers ending with "."
                          if (inputValue === '.' || inputValue.endsWith('.')) {
                            // Keep the input as-is for display but don't update the numeric value yet
                            // This allows users to type decimal numbers naturally
                            const baseValue = inputValue === '.' ? 0 : parseFloat(inputValue);
                            field.onChange(!isNaN(baseValue) ? baseValue : 0);
                          } else {
                            const parsedValue = parseFloat(inputValue);
                            console.log('[DEBUG] Parsed value:', parsedValue);
                            console.log('[DEBUG] Is NaN?:', isNaN(parsedValue));

                            // Always set a valid number, default to 0 if NaN
                            field.onChange(!isNaN(parsedValue) ? parsedValue : 0);
                            console.log('[DEBUG] Setting field value to:', !isNaN(parsedValue) ? parsedValue : 0);
                          }
                        } else {
                          console.log('[DEBUG] Input does not match regex pattern');
                        }

                        console.log('[DEBUG] Current field.value after onChange:', field.value);
                      }}
                      onBlur={() => {
                        console.log('[DEBUG] onBlur triggered');
                        console.log('[DEBUG] Field value on blur:', field.value);

                        // Ensure field has a valid number on blur
                        if (field.value === undefined || field.value === null || isNaN(field.value as number)) {
                          console.log('[DEBUG] Invalid value on blur, setting to 0');
                          field.onChange(0);
                        }

                        field.onBlur();
                      }}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Leave as 0 for free tickets
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="TRY">TRY - Turkish Lira</SelectItem>
                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="quantity_available"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity Available (optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  placeholder="Leave empty for unlimited"
                  {...field}
                  value={field.value || ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                />
              </FormControl>
              <FormDescription>
                Maximum number of tickets available for this tier
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="sales_start"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Sales Start (optional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  When ticket sales begin
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sales_end"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Sales End (optional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  When ticket sales end
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="min_per_order"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum per Order</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 1)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="max_per_order"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum per Order</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 10)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="is_hidden"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Hide this tier</FormLabel>
                <FormDescription>
                  Hidden tiers won&apos;t be shown to attendees
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : tier
              ? "Update Tier"
              : "Create Tier"}
          </Button>
        </div>
      </form>
    </Form>
  );
}