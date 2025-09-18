"use client";

/**
 * Manage discount codes
 */

import { useState } from "react";
import {
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Calendar,
  Users,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

import { DiscountCodeForm } from "./DiscountCodeForm";
import {
  useDiscountCodes,
  useDeleteDiscountCode,
  useTicketTiers,
} from "@/hooks/useTicketTiers";
import { useCurrency } from "@/hooks/useCurrency";
import type { DiscountCode, Currency } from "@/lib/types/tickets";

interface DiscountCodeListProps {
  eventId: string;
  eventCurrency?: Currency;
  canEdit?: boolean;
}

export function DiscountCodeList({
  eventId,
  eventCurrency = "USD",
  canEdit = true,
}: DiscountCodeListProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deletingCode, setDeletingCode] = useState<DiscountCode | null>(null);

  const { data: codes = [], isLoading } = useDiscountCodes(eventId);
  const { data: tiers = [] } = useTicketTiers(eventId);
  const deleteMutation = useDeleteDiscountCode();
  const { formatMoney } = useCurrency();

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied to clipboard");
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleDelete = async () => {
    if (!deletingCode) return;

    try {
      await deleteMutation.mutateAsync(deletingCode.id);
      setDeletingCode(null);
      toast.success("Discount code deleted");
    } catch {
      console.error("Error deleting code:", error);
      toast.error("Failed to delete discount code");
    }
  };

  const getCodeStatus = (code: DiscountCode) => {
    const now = new Date();

    // Check if expired
    if (code.valid_until && new Date(code.valid_until) < now) {
      return { status: "expired", label: "Expired", variant: "secondary" as const };
    }

    // Check if not yet valid
    if (new Date(code.valid_from) > now) {
      return { status: "scheduled", label: "Scheduled", variant: "outline" as const };
    }

    // Check if usage limit reached
    if (code.usage_limit && code.usage_count >= code.usage_limit) {
      return { status: "exhausted", label: "Exhausted", variant: "secondary" as const };
    }

    return { status: "active", label: "Active", variant: "default" as const };
  };

  const getApplicableTiersDisplay = (code: DiscountCode) => {
    if (!code.applicable_tiers || code.applicable_tiers.length === 0) {
      return "All tiers";
    }

    const tierNames = code.applicable_tiers
      .map((tierId) => tiers.find((t) => t.id === tierId)?.name)
      .filter(Boolean);

    if (tierNames.length === 0) return "All tiers";
    if (tierNames.length === 1) return tierNames[0];
    return `${tierNames.length} tiers`;
  };

  if (isLoading) {
    return <div>Loading discount codes...</div>;
  }

  if (codes.length === 0 && !canEdit) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No discount codes configured for this event.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Discount Codes</CardTitle>
          {canEdit && (
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Code
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No discount codes created yet.</p>
              {canEdit && (
                <p className="mt-2 text-sm">
                  Click &quot;Add Code&quot; to create your first discount code.
                </p>
              )}
            </div>
          ) : (
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Applies To</TableHead>
                    <TableHead>Status</TableHead>
                    {canEdit && <TableHead className="w-[100px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => {
                    const status = getCodeStatus(code);
                    return (
                      <TableRow key={code.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">
                              {code.code}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleCopyCode(code.code)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy code</TooltipContent>
                            </Tooltip>
                          </div>
                          {code.description && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {code.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {code.discount_type === "percentage"
                            ? `${code.discount_value}%`
                            : formatMoney(code.discount_value, eventCurrency)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {code.usage_count}
                              {code.usage_limit && ` / ${code.usage_limit}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span>
                                From {format(new Date(code.valid_from), "MMM d")}
                              </span>
                            </div>
                            {code.valid_until && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span>
                                  Until{" "}
                                  {format(new Date(code.valid_until), "MMM d")}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {getApplicableTiersDisplay(code)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.status === "active" && (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            )}
                            {status.status === "expired" && (
                              <XCircle className="mr-1 h-3 w-3" />
                            )}
                            {status.label}
                          </Badge>
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingCode(code)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Discount Code</DialogTitle>
            <DialogDescription>
              Create a new discount code for your event
            </DialogDescription>
          </DialogHeader>
          <DiscountCodeForm
            eventId={eventId}
            eventCurrency={eventCurrency}
            onSuccess={() => setShowCreateDialog(false)}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingCode}
        onOpenChange={() => setDeletingCode(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the discount code &quot;{deletingCode?.code}&quot;?
              This action cannot be undone.
              {deletingCode && deletingCode.usage_count > 0 && (
                <span className="mt-2 block text-amber-600">
                  This code has been used {deletingCode.usage_count} time
                  {deletingCode.usage_count !== 1 && "s"}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}