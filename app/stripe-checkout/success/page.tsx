"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Download, Home, Ticket, Loader2, Mail, QrCode, Calendar, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";

interface TicketData {
  id: string;
  ticketNumber: string;
  qrCode: string;
  attendeeName: string;
  attendeeEmail: string;
  status: string;
  ticketType: string;
}

interface SessionData {
  success: boolean;
  sessionId: string;
  orderId?: string;
  eventName: string;
  eventDate?: string;
  eventLocation?: string;
  eventSlug?: string;
  communityName?: string;
  communitySlug?: string;
  ticketCount: number;
  total: string;
  customerEmail: string;
  customerName?: string;
  paymentStatus: string;
  orderStatus?: string;
  tickets: TicketData[];
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({});
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const session = searchParams.get("session_id");
    if (session) {
      setSessionId(session);
      verifySession(session);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const verifySession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/stripe/verify-session?session_id=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSessionData(data);

        // If tickets are not yet generated, retry after a delay
        if (data.tickets.length === 0 && data.paymentStatus === "paid" && retryCount < 5) {
          setTicketsLoading(true);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            verifySession(sessionId);
          }, 2000); // Retry after 2 seconds
        } else {
          // Generate QR codes for tickets
          if (data.tickets.length > 0) {
            await generateQRCodes(data.tickets);
          }
          setTicketsLoading(false);
        }
      }
    } catch (error) {
      console.error("Error verifying session:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCodes = async (tickets: TicketData[]) => {
    const codes: { [key: string]: string } = {};
    for (const ticket of tickets) {
      try {
        // Generate QR code containing the ticket verification code
        const qrData = JSON.stringify({
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          qrCode: ticket.qrCode,
          eventName: sessionData?.eventName,
          attendeeName: ticket.attendeeName
        });
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
          width: 300,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#FFFFFF"
          }
        });
        codes[ticket.id] = qrCodeDataUrl;
      } catch (error) {
        console.error("Error generating QR code:", error);
      }
    }
    setQrCodes(codes);
  };

  const downloadTicket = (ticket: TicketData) => {
    // In a real implementation, this would generate a PDF or image
    const ticketInfo = `
Ticket Number: ${ticket.ticketNumber}
Event: ${sessionData?.eventName}
Date: ${sessionData?.eventDate ? new Date(sessionData.eventDate).toLocaleString() : "TBD"}
Location: ${sessionData?.eventLocation || "TBD"}
Attendee: ${ticket.attendeeName}

This ticket is valid for one admission.
Please present the QR code at the venue.
    `;

    const blob = new Blob([ticketInfo], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket-${ticket.ticketNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Alert>
          <AlertDescription>
            No payment session found. Please check your email for confirmation.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/">
            <Button variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-muted-foreground">
          Your tickets have been confirmed and are ready for download
        </p>
      </div>

      {/* Order Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Order Confirmation</CardTitle>
          <CardDescription>
            Order #{sessionData.orderId?.slice(0, 8) || sessionId?.slice(0, 8)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Event Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">{sessionData.eventName}</h3>

            {sessionData.eventDate && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-2 h-4 w-4" />
                {formatDate(sessionData.eventDate)}
              </div>
            )}

            {sessionData.eventLocation && (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="mr-2 h-4 w-4" />
                {sessionData.eventLocation}
              </div>
            )}

            {sessionData.communityName && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Badge variant="secondary">{sessionData.communityName}</Badge>
              </div>
            )}
          </div>

          <Separator />

          {/* Purchase Details */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tickets</span>
              <span>{sessionData.ticketCount} ticket(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Paid</span>
              <span className="font-semibold text-lg">{sessionData.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Purchaser</span>
              <span>{sessionData.customerName || sessionData.customerEmail}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Section */}
      {ticketsLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Generating your tickets...</p>
              <p className="text-sm text-muted-foreground mt-2">This may take a few seconds</p>
            </div>
          </CardContent>
        </Card>
      ) : sessionData.tickets.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Your Tickets</h2>

          <div className="grid gap-6 md:grid-cols-2">
            {sessionData.tickets.map((ticket, index) => (
              <Card key={ticket.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        Ticket {index + 1} of {sessionData.tickets.length}
                      </CardTitle>
                      <CardDescription>{ticket.ticketNumber}</CardDescription>
                    </div>
                    <Badge variant={ticket.status === "valid" ? "default" : "secondary"}>
                      {ticket.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* QR Code */}
                  {qrCodes[ticket.id] && (
                    <div className="flex justify-center p-4 bg-white rounded-lg border">
                      <img
                        src={qrCodes[ticket.id]}
                        alt="Ticket QR Code"
                        className="w-48 h-48"
                      />
                    </div>
                  )}

                  {/* Ticket Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span>{ticket.ticketType || "General Admission"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Attendee</span>
                      <span>{ticket.attendeeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="text-xs">{ticket.attendeeEmail}</span>
                    </div>
                  </div>

                  {/* Download Button */}
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => downloadTicket(ticket)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Ticket
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Instructions */}
          <Alert>
            <Ticket className="h-4 w-4" />
            <AlertDescription>
              <strong>Important Information</strong>
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>Save or print your tickets - you'll need them for entry</li>
                <li>Each QR code is unique and can only be scanned once</li>
                <li>Tickets have been sent to {sessionData.customerEmail}</li>
                <li>Present the QR code at the venue for quick check-in</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <Alert>
          <AlertDescription>
            Your tickets are being processed and will be sent to your email shortly.
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        {sessionData.communitySlug && sessionData.eventSlug && (
          <Link href={`/communities/${sessionData.communitySlug}/events/${sessionData.eventSlug}`}>
            <Button variant="outline">
              View Event Details
            </Button>
          </Link>
        )}
        <Link href="/tickets">
          <Button variant="outline">
            <Ticket className="mr-2 h-4 w-4" />
            View All Tickets
          </Button>
        </Link>
        <Link href="/">
          <Button variant="ghost">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}