"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, Download, FileSpreadsheet, FileText, FileType } from "lucide-react";
import { cn } from "@/lib/utils";

const exportFormats = [
  { value: "csv", label: "CSV", icon: FileText, description: "Comma-separated values" },
  { value: "excel", label: "Excel", icon: FileSpreadsheet, description: "Microsoft Excel (.xlsx)" },
  { value: "pdf", label: "PDF", icon: FileType, description: "PDF report with formatting" },
] as const;

const exportColumns = [
  { id: "order_number", label: "Order Number" },
  { id: "customer_name", label: "Customer Name" },
  { id: "customer_email", label: "Customer Email" },
  { id: "event_name", label: "Event Name" },
  { id: "event_date", label: "Event Date" },
  { id: "amount", label: "Amount" },
  { id: "fee", label: "Service Fee" },
  { id: "status", label: "Status" },
  { id: "created_at", label: "Order Date" },
  { id: "paid_at", label: "Payment Date" },
  { id: "refunded_amount", label: "Refunded Amount" },
  { id: "ticket_count", label: "Number of Tickets" },
  { id: "ticket_numbers", label: "Ticket Numbers" },
] as const;

const exportSchema = z.object({
  format: z.enum(["csv", "excel", "pdf"]),
  date_from: z.date().optional(),
  date_to: z.date().optional(),
  columns: z.array(z.string()).min(1, "Select at least one column"),
  include_refunded: z.boolean().default(true),
  include_failed: z.boolean().default(false),
});

type ExportFormValues = z.infer<typeof exportSchema>;

interface OrderExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (params: {
    format: "csv" | "excel" | "pdf";
    date_from?: string;
    date_to?: string;
    columns: string[];
    filters: {
      include_refunded: boolean;
      include_failed: boolean;
    };
  }) => void;
  eventId?: string;
  communityId?: string;
  isExporting?: boolean;
}

export function OrderExportDialog({
  open,
  onClose,
  onExport,
  eventId,
  communityId,
  isExporting = false,
}: OrderExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<"csv" | "excel" | "pdf">("csv");

  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportSchema),
    defaultValues: {
      format: "csv",
      columns: [
        "order_number",
        "customer_name",
        "customer_email",
        "event_name",
        "amount",
        "status",
        "created_at",
      ],
      include_refunded: true,
      include_failed: false,
    },
  });

  const handleSubmit = (values: ExportFormValues) => {
    onExport({
      format: values.format,
      date_from: values.date_from?.toISOString(),
      date_to: values.date_to?.toISOString(),
      columns: values.columns,
      filters: {
        include_refunded: values.include_refunded,
        include_failed: values.include_failed,
      },
    });
  };

  const selectedFormatInfo = exportFormats.find((f) => f.value === selectedFormat);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Orders</DialogTitle>
          <DialogDescription>
            Export your order data in your preferred format
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Export Format */}
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Export Format</FormLabel>
                  <div className="grid grid-cols-3 gap-3">
                    {exportFormats.map((format) => {
                      const Icon = format.icon;
                      return (
                        <button
                          key={format.value}
                          type="button"
                          onClick={() => {
                            field.onChange(format.value);
                            setSelectedFormat(format.value);
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors",
                            field.value === format.value
                              ? "border-primary bg-primary/5"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <Icon className="h-8 w-8 mb-2" />
                          <span className="font-medium">{format.label}</span>
                          <span className="text-xs text-gray-500">
                            {format.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Date</FormLabel>
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
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Leave empty to include all orders
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Date</FormLabel>
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
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Leave empty to include all orders
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Columns Selection */}
            <FormField
              control={form.control}
              name="columns"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Select Columns to Export</FormLabel>
                    <FormDescription>
                      Choose which data fields to include in your export
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {exportColumns.map((column) => (
                      <FormField
                        key={column.id}
                        control={form.control}
                        name="columns"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={column.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(column.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, column.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== column.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {column.label}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Filter Options */}
            <div className="space-y-3">
              <FormLabel>Include in Export</FormLabel>
              <FormField
                control={form.control}
                name="include_refunded"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        Include refunded orders
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="include_failed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        Include failed orders
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Format-specific info */}
            {selectedFormat === "pdf" && (
              <Alert>
                <FileType className="h-4 w-4" />
                <AlertDescription>
                  PDF export will include formatting and your community branding.
                  The file will be optimized for printing and sharing.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isExporting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isExporting}>
                {isExporting ? (
                  <>
                    <Download className="mr-2 h-4 w-4 animate-pulse" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export Orders
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}