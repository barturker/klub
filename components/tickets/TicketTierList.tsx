"use client";

/**
 * List and manage ticket tiers
 */

import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  GripVertical,
  Edit,
  Trash2,
  Plus,
  Users,
  Calendar,
  DollarSign,
  EyeOff,
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

import { TicketTierForm } from "./TicketTierForm";
import { GroupPricingSettings } from "./GroupPricingSettings";
import { useCurrency } from "@/hooks/useCurrency";
import {
  useTicketTiers,
  useDeleteTicketTier,
  useUpdateTierOrder,
} from "@/hooks/useTicketTiers";
import type { TicketTier } from "@/lib/types/tickets";

interface TicketTierListProps {
  eventId: string;
  canEdit?: boolean;
}

export function TicketTierList({ eventId, canEdit = true }: TicketTierListProps) {
  const [editingTier, setEditingTier] = useState<TicketTier | null>(null);
  const [deletingTier, setDeletingTier] = useState<TicketTier | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [configuringGroupPricing, setConfiguringGroupPricing] = useState<TicketTier | null>(null);

  const { data: tiers = [], isLoading } = useTicketTiers(eventId);
  const deleteMutation = useDeleteTicketTier();
  const updateOrderMutation = useUpdateTierOrder();
  const { formatMoney } = useCurrency();

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(tiers);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update sort order for all affected items
    const updates = items.map((item, index) => ({
      id: item.id,
      sort_order: index,
    }));

    await updateOrderMutation.mutateAsync({
      eventId,
      tierOrders: updates,
    });
  };

  const handleDelete = async () => {
    if (!deletingTier) return;

    try {
      await deleteMutation.mutateAsync(deletingTier.id);
      setDeletingTier(null);
    } catch (error) {
      console.error("Error deleting tier:", error);
    }
  };

  if (isLoading) {
    return <div>Loading ticket tiers...</div>;
  }

  if (tiers.length === 0 && !canEdit) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No ticket tiers configured for this event.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Ticket Tiers</CardTitle>
          {canEdit && (
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Tier
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {tiers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No ticket tiers created yet.</p>
              {canEdit && (
                <p className="mt-2 text-sm">
                  Click &quot;Add Tier&quot; to create your first ticket tier.
                </p>
              )}
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="tiers">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {tiers.map((tier, index) => (
                      <Draggable
                        key={tier.id}
                        draggableId={tier.id}
                        index={index}
                        isDragDisabled={!canEdit}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`rounded-lg border bg-card p-4 ${
                              snapshot.isDragging ? "shadow-lg" : ""
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {canEdit && (
                                <div
                                  {...provided.dragHandleProps}
                                  className="mt-1 cursor-move text-muted-foreground"
                                >
                                  <GripVertical className="h-5 w-5" />
                                </div>
                              )}

                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-semibold">
                                        {tier.name}
                                      </h4>
                                      {tier.is_hidden && (
                                        <Badge variant="secondary">
                                          <EyeOff className="mr-1 h-3 w-3" />
                                          Hidden
                                        </Badge>
                                      )}
                                    </div>

                                    {tier.description && (
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        {tier.description}
                                      </p>
                                    )}

                                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                                      <div className="flex items-center gap-1">
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">
                                          {(!tier.price_cents || tier.price_cents === 0)
                                            ? "Free"
                                            : formatMoney(
                                                tier.price_cents || 0,
                                                tier.currency || "USD"
                                              )}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span>
                                          {tier.quantity_available
                                            ? `${tier.quantity_sold} / ${tier.quantity_available}`
                                            : `${tier.quantity_sold} sold`}
                                        </span>
                                      </div>

                                      {tier.sales_start && (
                                        <div className="flex items-center gap-1">
                                          <Calendar className="h-4 w-4 text-muted-foreground" />
                                          <span>
                                            Starts{" "}
                                            {format(
                                              new Date(tier.sales_start),
                                              "MMM d"
                                            )}
                                          </span>
                                        </div>
                                      )}

                                      {tier.sales_end && (
                                        <div className="flex items-center gap-1">
                                          <Calendar className="h-4 w-4 text-muted-foreground" />
                                          <span>
                                            Ends{" "}
                                            {format(
                                              new Date(tier.sales_end),
                                              "MMM d"
                                            )}
                                          </span>
                                        </div>
                                      )}

                                      <div className="text-muted-foreground">
                                        {tier.min_per_order}-
                                        {tier.max_per_order} per order
                                      </div>
                                    </div>
                                  </div>

                                  {canEdit && (
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setConfiguringGroupPricing(tier)}
                                      >
                                        <Users className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingTier(tier)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeletingTier(tier)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Ticket Tier</DialogTitle>
            <DialogDescription>
              Add a new ticket tier for your event
            </DialogDescription>
          </DialogHeader>
          <TicketTierForm
            eventId={eventId}
            onSuccess={() => setShowCreateDialog(false)}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTier} onOpenChange={() => setEditingTier(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Ticket Tier</DialogTitle>
            <DialogDescription>
              Update the ticket tier configuration
            </DialogDescription>
          </DialogHeader>
          {editingTier && (
            <TicketTierForm
              eventId={eventId}
              tier={editingTier}
              onSuccess={() => setEditingTier(null)}
              onCancel={() => setEditingTier(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Group Pricing Dialog */}
      {configuringGroupPricing && (
        <Dialog
          open={!!configuringGroupPricing}
          onOpenChange={() => setConfiguringGroupPricing(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Group Pricing - {configuringGroupPricing.name}</DialogTitle>
              <DialogDescription>
                Configure bulk purchase discounts for this tier
              </DialogDescription>
            </DialogHeader>
            <GroupPricingSettings
              tier={configuringGroupPricing}
              onClose={() => setConfiguringGroupPricing(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingTier}
        onOpenChange={() => setDeletingTier(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket Tier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the &quot;{deletingTier?.name}&quot; tier?
              This action cannot be undone.
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