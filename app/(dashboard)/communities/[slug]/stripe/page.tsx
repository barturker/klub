"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  ArrowUpRight,
  Loader2,
} from "lucide-react";

interface StripeAccountStatus {
  connected: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements?: string[];
  account_id?: string;
}

interface BalanceInfo {
  available: number;
  pending: number;
  currency: string;
}

export default function StripeConnectDashboard() {
  const params = useParams();
  const communitySlug = params.slug as string;

  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(null);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);

  useEffect(() => {
    checkAccountStatus();
  }, []);

  const checkAccountStatus = async () => {
    try {
      const response = await fetch(`/api/stripe/connect?action=status&community_slug=${communitySlug}`);
      if (response.ok) {
        const data = await response.json();
        setAccountStatus(data);

        if (data.connected && data.charges_enabled) {
          fetchBalance();
        }
      }
    } catch (error) {
      console.error("Error checking account status:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await fetch(`/api/stripe/balance?community_slug=${communitySlug}`);
      if (response.ok) {
        const data = await response.json();
        setBalance(data);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const startOnboarding = async () => {
    setConnectLoading(true);
    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          community_slug: communitySlug,
          return_url: `${window.location.origin}/communities/${communitySlug}/stripe`,
          refresh_url: `${window.location.origin}/communities/${communitySlug}/stripe`,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Check if test mode response
        if (data.test_mode) {
          // Test account created, refresh status
          await checkAccountStatus();
          alert("Test Stripe account created! In production, you would complete Stripe onboarding.");
        } else if (data.onboarding_url) {
          // Real onboarding URL
          window.location.href = data.onboarding_url;
        }
      }
    } catch (error) {
      console.error("Error starting onboarding:", error);
    } finally {
      setConnectLoading(false);
    }
  };

  const openDashboard = async () => {
    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dashboard",
          community_slug: communitySlug,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.dashboard_url) {
          window.open(data.dashboard_url, "_blank");
        }
      }
    } catch (error) {
      console.error("Error opening dashboard:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Stripe Payment Settings</h1>
        <p className="text-muted-foreground">
          Manage your payment settings and view your earnings
        </p>
      </div>

      {/* Account Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Stripe Account Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!accountStatus?.connected ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Stripe Account Not Connected</AlertTitle>
                <AlertDescription>
                  Connect your Stripe account to start accepting payments for your events.
                </AlertDescription>
              </Alert>

              <Button
                onClick={startOnboarding}
                disabled={connectLoading}
                className="w-full sm:w-auto"
              >
                {connectLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Connect Stripe Account
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Account Connected</p>
                  <p className="text-sm text-muted-foreground">
                    Account ID: {accountStatus.account_id}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Badge variant={accountStatus.charges_enabled ? "default" : "secondary"}>
                  {accountStatus.charges_enabled ? "Charges Enabled" : "Charges Disabled"}
                </Badge>
                <Badge variant={accountStatus.payouts_enabled ? "default" : "secondary"}>
                  {accountStatus.payouts_enabled ? "Payouts Enabled" : "Payouts Disabled"}
                </Badge>
              </div>

              {accountStatus.requirements && accountStatus.requirements.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Action Required</AlertTitle>
                  <AlertDescription>
                    Complete the following requirements in your Stripe dashboard:
                    <ul className="list-disc list-inside mt-2">
                      {accountStatus.requirements.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button onClick={openDashboard} variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Stripe Dashboard
                </Button>
                <Button onClick={checkAccountStatus} variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Balance Information */}
      {accountStatus?.connected && accountStatus?.charges_enabled && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Available Balance
              </CardTitle>
              <CardDescription>Funds ready for payout</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                ${balance ? (balance.available / 100).toFixed(2) : "0.00"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {balance?.currency.toUpperCase() || "USD"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Pending Balance
              </CardTitle>
              <CardDescription>Funds being processed</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                ${balance ? (balance.pending / 100).toFixed(2) : "0.00"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Typically available in 2-7 business days
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium">1</span>
            </div>
            <div>
              <p className="font-medium">Connect Your Account</p>
              <p className="text-sm text-muted-foreground">
                Link your Stripe account to start accepting payments
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium">2</span>
            </div>
            <div>
              <p className="font-medium">Sell Event Tickets</p>
              <p className="text-sm text-muted-foreground">
                Your attendees pay securely through Stripe
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium">3</span>
            </div>
            <div>
              <p className="font-medium">Receive Payouts</p>
              <p className="text-sm text-muted-foreground">
                Funds are automatically transferred to your bank account
              </p>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Platform Fee:</strong> We charge a 5.9% + 30¢ service fee on each transaction.
              This covers payment processing, platform maintenance, and support.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}