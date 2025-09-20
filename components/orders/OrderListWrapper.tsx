"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrderList } from "./OrderList";
import { OrderExportDialog } from "./OrderExportDialog";
import { useExportOrders } from "@/hooks/useOrders";
import { toast } from "sonner";

interface OrderListWrapperProps {
  initialOrders: any[];
  totalCount: number;
  communityId: string;
  eventId?: string;
}

export function OrderListWrapper({
  initialOrders,
  totalCount,
  communityId,
  eventId,
}: OrderListWrapperProps) {
  const router = useRouter();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const exportMutation = useExportOrders();

  const handleOrderClick = (order: any) => {
    router.push(`/orders/${order.id}`);
  };

  const handleExport = async (params: any) => {
    try {
      const result = await exportMutation.mutateAsync({
        community_id: communityId,
        event_id: eventId,
        ...params,
      });

      if (result.export_id) {
        // Start download
        window.open(`/api/exports/${result.export_id}/download`, "_blank");
        toast.success("Export started! Download will begin shortly.");
      }
    } catch (error) {
      toast.error("Failed to export orders. Please try again.");
    } finally {
      setShowExportDialog(false);
    }
  };

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <>
      <OrderList
        orders={initialOrders}
        totalCount={totalCount}
        onOrderClick={handleOrderClick}
        onExport={() => setShowExportDialog(true)}
        onRefresh={handleRefresh}
      />

      {showExportDialog && (
        <OrderExportDialog
          open={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          onExport={handleExport}
          communityId={communityId}
          eventId={eventId}
          isExporting={exportMutation.isPending}
        />
      )}
    </>
  );
}