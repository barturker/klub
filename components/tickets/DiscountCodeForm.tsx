"use client";

/**
 * Create discount codes
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { nanoid } from "nanoid";

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
import { Checkbox } from "@/components/ui/checkbox";

import { cn } from "@/lib/utils";
import { useCreateDiscountCode, useTicketTiers } from "@/hooks/useTicketTiers";
import { useCurrency } from "@/hooks/useCurrency";
import type { Currency } from "@/lib/types/tickets";

// Form validation schema
const discountCodeSchema = z
  .object({
    code: z
      .string()
      .min(3, "Code must be at least 3 characters")
      .max(20, "Code must be at most 20 characters")
      .regex(
        /^[A-Z0-9_-]+$/i,
        "Code can only contain letters, numbers, hyphens, and underscores"
      ),
    description: z.string().optional(),
    discount_type: z.enum(["percentage", "fixed"]),
    discount_value: z.number().min(0),
    applicable_tiers: z.array(z.string()).optional(),
    usage_limit: z.number().optional().nullable(),
    valid_until: z.date().optional().nullable(),
    minimum_purchase: z.number().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.discount_type === "percentage") {
        return data.discount_value >= 0 && data.discount_value <= 100;
      }
      return data.discount_value >= 0;
    },
    {
      message: "Percentage discount must be between 0 and 100",
      path: ["discount_value"],
    }
  );

type DiscountCodeFormData = z.infer<typeof discountCodeSchema>;

interface DiscountCodeFormProps {
  eventId: string;
  eventCurrency?: Currency;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DiscountCodeForm({
  eventId,
  eventCurrency = "USD",
  onSuccess,
  onCancel,
}: DiscountCodeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: tiers = [] } = useTicketTiers(eventId);
  const createMutation = useCreateDiscountCode();
  const { toMinorUnits, getCurrencySymbol } = useCurrency();

  const form = useForm<DiscountCodeFormData>({
    resolver: zodResolver(discountCodeSchema),
    defaultValues: {
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: 10,
      applicable_tiers: [],
      usage_limit: null,
      valid_until: null,
      minimum_purchase: null,
    },
  });

  const discountType = form.watch("discount_type");

  const generateCode = () => {
    const code = nanoid(8).toUpperCase().replace(/[^A-Z0-9]/g, "");
    form.setValue("code", code);
  };

  const onSubmit = async (data: DiscountCodeFormData) => {
    setIsSubmitting(true);

    try {
      const formData = {
        code: data.code.toUpperCase(),
        description: data.description || null,
        discount_type: data.discount_type,
        discount_value:
          data.discount_type === "fixed"
            ? toMinorUnits(data.discount_value, eventCurrency)
            : Math.round(data.discount_value),
        applicable_tiers:
          data.applicable_tiers && data.applicable_tiers.length > 0
            ? data.applicable_tiers
            : null,
        usage_limit: data.usage_limit || null,
        valid_until: data.valid_until?.toISOString() || null,
        minimum_purchase_cents: data.minimum_purchase
          ? toMinorUnits(data.minimum_purchase, eventCurrency)
          : null,
      };

      await createMutation.mutateAsync({
        eventId,
        data: formData,
      });

      onSuccess?.();
    } catch (error: unknown) {
      console.error("Error creating discount code:", error);
      if (error instanceof Error && error.message?.includes("duplicate")) {
        form.setError("code", {
          message: "This code already exists for this event",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Discount Code</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., SUMMER20, EARLYBIRD"
                    className="uppercase"
                    {...field}
                  />
                  <Button type="button" variant="outline" onClick={generateCode}>
                    Generate
                  </Button>
                </div>
              </FormControl>
              <FormDescription>
                The code customers will enter at checkout
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
                  placeholder="Internal description for this discount code"
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
            name="discount_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select discount type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discount_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {discountType === "percentage" ? "Percentage" : "Amount"}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {discountType === "percentage"
                        ? "%"
                        : getCurrencySymbol(eventCurrency)}
                    </span>
                    <Input
                      type="number"
                      step={discountType === "percentage" ? "1" : "0.01"}
                      min="0"
                      max={discountType === "percentage" ? "100" : undefined}
                      placeholder="0"
                      className="pl-8"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  {discountType === "percentage"
                    ? "Percentage off the total price"
                    : "Fixed amount to subtract from total"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {tiers.length > 0 && (
          <FormField
            control={form.control}
            name="applicable_tiers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Applicable Ticket Tiers (optional)</FormLabel>
                <FormDescription>
                  Select which tiers this code applies to. Leave empty for all
                  tiers.
                </FormDescription>
                <div className="space-y-2 rounded-lg border p-4">
                  {tiers.map((tier) => (
                    <div
                      key={tier.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        checked={field.value?.includes(tier.id) || false}
                        onCheckedChange={(checked) => {
                          const current = field.value || [];
                          if (checked) {
                            field.onChange([...current, tier.id]);
                          } else {
                            field.onChange(
                              current.filter((id) => id !== tier.id)
                            );
                          }
                        }}
                      />
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {tier.name}
                      </label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="usage_limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Usage Limit (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
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
                  Maximum number of times this code can be used
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minimum_purchase"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Purchase (optional)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {getCurrencySymbol(eventCurrency)}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="No minimum"
                      className="pl-8"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Minimum order amount required to use this code
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="valid_until"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Expiration Date (optional)</FormLabel>
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
                        <span>No expiration</span>
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
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                When this discount code will stop working
              </FormDescription>
              <FormMessage />
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
            {isSubmitting ? "Creating..." : "Create Discount Code"}
          </Button>
        </div>
      </form>
    </Form>
  );
}