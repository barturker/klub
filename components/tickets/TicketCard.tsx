"use client";

import { useState } from "react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface TicketCardProps {
  ticket: {
    id: string;
    ticket_number: string;
    status: string;
    tier?: {
      name: string;
      price_cents: number;
    };
    checked_in_at?: string | null;
  };
  event?: {
    title: string;
    start_at: string;
    community?: {
      name: string;
    };
  };
  buyer?: {
    name: string;
    email: string;
  };
  orderNumber?: string;
}

export function TicketCard({ ticket, event, buyer, orderNumber }: TicketCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "cancelled":
      case "refunded":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "used":
        return <Badge className="bg-gray-100 text-gray-800">Used</Badge>;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "valid":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
      case "refunded":
        return "bg-red-100 text-red-800 border-red-200";
      case "used":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const ticketData = JSON.stringify({
    id: ticket.id,
    number: ticket.ticket_number,
    orderId: orderNumber,
  });

  return (
    <>
      <Card className={`relative overflow-hidden transition-all hover:shadow-lg ${
        ticket.status !== "valid" ? "opacity-75" : ""
      }`}>
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 to-pink-500" />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Ticket className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base">
                  {ticket.tier?.name || "General Admission"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  #{ticket.ticket_number}
                </p>
              </div>
            </div>
            <Badge className={`${getStatusColor(ticket.status)} border`}>
              {getStatusIcon(ticket.status)}
              <span className="ml-1 capitalize">{ticket.status}</span>
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="space-y-2 text-sm">
                {event && (
                  <>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium">{event.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span>{format(new Date(event.start_at), "PPP 'at' p")}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 ml-4">
              <div className="p-2 bg-white rounded-lg border">
                <QRCodeSVG
                  value={ticketData}
                  size={80}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-lg font-bold">
              {formatCurrency(ticket.tier?.price_cents || 0)}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(true)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={ticket.status !== "valid"}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>

          {ticket.checked_in_at && (
            <div className="pt-2 border-t">
              <p className="text-xs text-green-600 font-medium">
                ✓ Checked in at {format(new Date(ticket.checked_in_at), "PPP 'at' p")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
            <DialogDescription>
              Complete information for ticket #{ticket.ticket_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-center p-6 bg-gray-50 rounded-lg">
              <div className="p-4 bg-white rounded-lg border">
                <QRCodeSVG
                  value={ticketData}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Ticket Number</p>
                <p className="font-mono font-medium">{ticket.ticket_number}</p>
              </div>

              {orderNumber && (
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="font-mono font-medium">#{orderNumber}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500">Ticket Type</p>
                <p className="font-medium">{ticket.tier?.name || "General Admission"}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Price</p>
                <p className="font-medium">{formatCurrency(ticket.tier?.price_cents || 0)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge className={`${getStatusColor(ticket.status)} border mt-1`}>
                  {getStatusIcon(ticket.status)}
                  <span className="ml-1 capitalize">{ticket.status}</span>
                </Badge>
              </div>

              {buyer && (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Purchaser</p>
                    <p className="font-medium">{buyer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{buyer.email}</p>
                  </div>
                </>
              )}

              {event && (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Event</p>
                    <p className="font-medium">{event.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-medium">
                      {format(new Date(event.start_at), "PPP 'at' p")}
                    </p>
                  </div>
                  {event.community && (
                    <div>
                      <p className="text-sm text-gray-500">Community</p>
                      <p className="font-medium">{event.community.name}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => setShowDetails(false)}
              >
                Close
              </Button>
              <Button
                className="flex-1"
                disabled={ticket.status !== "valid"}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}