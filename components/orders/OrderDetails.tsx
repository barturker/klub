"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  CreditCard,
  Download,
  Mail,
  MoreVertical,
  RefreshCcw,
  User,
  Calendar,
  Receipt,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { RefundModal } from "./RefundModal";
import { OrderModificationForm } from "./OrderModificationForm";
import { Database } from "@/lib/supabase/database.types";
import { TicketCard } from "@/components/tickets/TicketCard";

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  order_number: string;
  event?: {
    id: string;
    title: string;
    start_at: string;
    community?: {
      name: string;
    };
  };
  buyer?: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
  };
  tickets?: Array<{
    id: string;
    ticket_number: string;
    status: string;
    tier?: {
      name: string;
      price_cents: number;
    };
  }>;
  refunds?: Array<{
    id: string;
    amount_cents: number;
    reason: string;
    created_at: string;
    status: string;
  }>;
  modifications?: Array<{
    id: string;
    type: string;
    created_at: string;
    modified_by?: {
      name: string;
    };
  }>;
};

interface OrderDetailsProps {
  order: Order;
  onRefund?: (orderId: string, amount: number, reason: string) => void;
  onModify?: (orderId: string, modification: any) => void;
  onGenerateInvoice?: (orderId: string) => void;
  onResendEmail?: (orderId: string) => void;
}

export function OrderDetails({
  order,
  onRefund,
  onModify,
  onGenerateInvoice,
  onResendEmail,
}: OrderDetailsProps) {
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showModifyForm, setShowModifyForm] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "failed":
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "refunded":
      case "partially_refunded":
        return <RefreshCcw className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "refunded":
      case "partially_refunded":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      case "pending":
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const totalRefunded = order.refunds?.reduce(
    (sum, r) => sum + (r.status === "succeeded" ? r.amount_cents : 0),
    0
  ) || 0;

  const canRefund = order.status === "paid" || order.status === "partially_refunded";
  const remainingRefundable = order.amount_cents - totalRefunded;

  return (
    <>
      <div className="space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">
                  Order #{order.order_number}
                </CardTitle>
                <CardDescription className="mt-2">
                  Placed on {format(new Date(order.created_at), "PPP 'at' p")}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(order.status)}>
                  {getStatusIcon(order.status)}
                  <span className="ml-1">
                    {order.status.replace("_", " ").toUpperCase()}
                  </span>
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {canRefund && (
                      <DropdownMenuItem onClick={() => setShowRefundModal(true)}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Process Refund
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setShowModifyForm(true)}>
                      <Receipt className="mr-2 h-4 w-4" />
                      Modify Order
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onGenerateInvoice?.(order.id)}>
                      <Download className="mr-2 h-4 w-4" />
                      Generate Invoice
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onResendEmail?.(order.id)}>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Confirmation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Customer Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={order.buyer?.avatar_url} />
                  <AvatarFallback>
                    {order.buyer?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex items-center text-sm text-gray-500">
                      <User className="mr-1 h-3 w-3" />
                      Name
                    </div>
                    <p className="font-medium">{order.buyer?.name || "N/A"}</p>
                  </div>
                  <div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail className="mr-1 h-3 w-3" />
                      Email
                    </div>
                    <p className="font-medium">{order.buyer?.email || "N/A"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(order.amount_cents - (order.fee_cents || 0))}
                </span>
              </div>
              {order.fee_cents && order.fee_cents > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fee</span>
                  <span className="font-medium">
                    {formatCurrency(order.fee_cents)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCurrency(order.amount_cents)}</span>
              </div>
              {totalRefunded > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between text-red-600">
                    <span>Refunded</span>
                    <span>-{formatCurrency(totalRefunded)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Net Amount</span>
                    <span>{formatCurrency(order.amount_cents - totalRefunded)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Event Information */}
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="mr-1 h-3 w-3" />
                  Event
                </div>
                <p className="font-medium">{order.event?.title || "N/A"}</p>
              </div>
              <div>
                <div className="text-sm text-gray-500">Community</div>
                <p className="font-medium">
                  {order.event?.community?.name || "N/A"}
                </p>
              </div>
              <div>
                <div className="text-sm text-gray-500">Date & Time</div>
                <p className="font-medium">
                  {order.event?.start_at
                    ? format(new Date(order.event.start_at), "PPP 'at' p")
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets ({order.tickets?.length || 0})</CardTitle>
            <CardDescription>
              {order.tickets?.length ? "Click on a ticket to view details" : "No tickets found for this order"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {order.tickets?.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {order.tickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    event={order.event}
                    buyer={order.buyer}
                    orderNumber={order.order_number}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No tickets available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Order Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Order Created */}
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Receipt className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Order Placed</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(order.created_at), "PPP 'at' p")}
                  </p>
                </div>
              </div>

              {/* Payment */}
              {order.paid_at && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                    <CreditCard className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Payment Received</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(order.paid_at), "PPP 'at' p")}
                    </p>
                  </div>
                </div>
              )}

              {/* Refunds */}
              {order.refunds?.map((refund) => (
                <div key={refund.id} className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                    <RefreshCcw className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      Refund {refund.status === "succeeded" ? "Processed" : refund.status}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(refund.amount_cents)} - {refund.reason}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(refund.created_at), "PPP 'at' p")}
                    </p>
                  </div>
                </div>
              ))}

              {/* Modifications */}
              {order.modifications?.map((mod) => (
                <div key={mod.id} className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                    <Receipt className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Order {mod.type}</p>
                    <p className="text-sm text-gray-500">
                      By {mod.modified_by?.name || "System"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(mod.created_at), "PPP 'at' p")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {showRefundModal && canRefund && (
        <RefundModal
          open={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          orderId={order.id}
          maxAmount={remainingRefundable}
          onRefund={(amount, reason, reasonDetails) => {
            onRefund?.(order.id, amount, reason);
            setShowRefundModal(false);
          }}
        />
      )}

      {showModifyForm && (
        <OrderModificationForm
          open={showModifyForm}
          onClose={() => setShowModifyForm(false)}
          order={order}
          onModify={(modification) => {
            onModify?.(order.id, modification);
            setShowModifyForm(false);
          }}
        />
      )}
    </>
  );
}