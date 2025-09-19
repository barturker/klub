"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Download, Home, Ticket, Loader2, Mail, QrCode } from "lucide-react";
import Link from "next/link";

interface SessionData {
  eventName: string;
  ticketCount: number;
  total: string;
  customerEmail: string;
  tickets?: any[];
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = searchParams.get("session_id");
    if (session) {
      setSessionId(session);
      verifySession(session);
    }
  }, [searchParams]);

  const verifySession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/stripe/verify-session?session_id=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSessionData(data);
      }
    } catch (error) {
      console.error("Error verifying session:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-muted-foreground">
          Your test payment has been processed successfully
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Confirmation</CardTitle>
          <CardDescription>Thank you for your purchase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Details */}
          <div className="space-y-4">
            <div className="border-l-4 border-green-600 pl-4">
              <p className="text-sm text-muted-foreground">Session ID</p>
              <p className="font-mono text-sm">{sessionId ? sessionId.slice(0, 20) + "..." : "Loading..."}</p>
            </div>

            {loading ? (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : sessionData ? (
              <>
                <div className="border-l-4 border-blue-600 pl-4">
                  <p className="text-sm text-muted-foreground">Event</p>
                  <p className="font-semibold">{sessionData.eventName}</p>
                  <p className="text-sm">{sessionData.ticketCount} Ticket(s)</p>
                </div>

                <div className="border-l-4 border-purple-600 pl-4">
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="font-semibold text-lg">{sessionData.total}</p>
                </div>

                <div className="border-l-4 border-indigo-600 pl-4">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-semibold">{sessionData.customerEmail}</p>
                </div>
              </>
            ) : (
              <Alert>
                <AlertDescription>Loading order details...</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Test Mode Notice */}
          <Alert>
            <Ticket className="h-4 w-4" />
            <AlertDescription>
              <strong>Test Mode Transaction</strong>
              <br />
              This was a test payment. No real money was charged. In production, you would
              receive:
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>Email confirmation with ticket</li>
                <li>QR code for event check-in</li>
                <li>Calendar invite</li>
                <li>Receipt for your records</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button className="flex-1" variant="outline" disabled>
              <Download className="mr-2 h-4 w-4" />
              Download Ticket (Demo)
            </Button>
            <Link href="/stripe-checkout" className="flex-1">
              <Button className="w-full" variant="outline">
                <Ticket className="mr-2 h-4 w-4" />
                Make Another Test
              </Button>
            </Link>
          </div>

          <div className="text-center pt-4">
            <Link href="/">
              <Button variant="ghost">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>

          {/* What Happened */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-3">What Just Happened?</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Payment intent created on Stripe servers</li>
              <li>Card details securely processed by Stripe</li>
              <li>Payment confirmed (test mode, no real charge)</li>
              <li>Order saved in your database</li>
              <li>Success redirect to this page</li>
            </ol>
          </div>

          {/* Next Steps */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-3">Next Steps for Production</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Set up webhook endpoints for payment events</li>
              <li>Implement email notifications</li>
              <li>Generate actual tickets with QR codes</li>
              <li>Add refund functionality</li>
              <li>Switch to live mode keys when ready</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}