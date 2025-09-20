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
  console.log("[WRAPPER_DEBUG] ======== OrderListWrapper Component ========");
  console.log("[WRAPPER_DEBUG] Props:", {
    initialOrdersCount: initialOrders?.length || 0,
    totalCount,
    communityId,
    eventId: eventId || "none"
  });

  const router = useRouter();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const exportMutation = useExportOrders();

  console.log("[WRAPPER_DEBUG] Export mutation state:", {
    isPending: exportMutation.isPending,
    isError: exportMutation.isError
  });

  const handleOrderClick = (order: any) => {
    console.log("[WRAPPER_DEBUG] Order clicked:", {
      orderId: order.id,
      orderNumber: order.order_number
    });
    router.push(`/orders/${order.id}`);
  };

  const handleExport = async (params: any) => {
    console.log("[WRAPPER_DEBUG] Export initiated with params:", params);
    try {
      const exportData = {
        community_id: communityId,
        event_id: eventId,
        ...params,
      };
      console.log("[WRAPPER_DEBUG] Sending export request:", exportData);

      const result = await exportMutation.mutateAsync(exportData);
      console.log("[WRAPPER_DEBUG] Export result:", result);

      if (result.export_id) {
        // Start download
        const downloadUrl = `/api/exports/${result.export_id}/download`;
        console.log("[WRAPPER_DEBUG] Opening download URL:", downloadUrl);
        window.open(downloadUrl, "_blank");
        toast.success("Export started! Download will begin shortly.");
      }
    } catch (error) {
      console.error("[WRAPPER_DEBUG] Export failed:", error);
      toast.error("Failed to export orders. Please try again.");
    } finally {
      setShowExportDialog(false);
    }
  };

  const handleRefresh = () => {
    console.log("[WRAPPER_DEBUG] Refresh triggered");
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