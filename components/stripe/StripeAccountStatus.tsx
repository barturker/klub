"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  CreditCard,
  DollarSign,
  Info,
} from "lucide-react";

interface StripeAccountStatusProps {
  communityId: string;
  communityName: string;
  onRefresh?: () => void;
}

interface AccountStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    errors: Array<{
      code: string;
      reason: string;
      requirement: string;
    }>;
  };
  stripeAccountId?: string;
  country?: string;
  defaultCurrency?: string;
}

export function StripeAccountStatus({
  communityId,
  communityName,
  onRefresh,
}: StripeAccountStatusProps) {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccountStatus = async () => {
    try {
      const response = await fetch(`/api/stripe/connect?community_id=${communityId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch account status");
      }

      setStatus(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching account status:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAccountStatus();
  }, [communityId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAccountStatus();
    onRefresh?.();
  };

  const handleContinueOnboarding = async () => {
    window.location.href = `/communities/${communityId}/stripe`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!status?.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stripe Not Connected</CardTitle>
          <CardDescription>
            Connect Stripe to accept payments for {communityName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.href = `/communities/${communityId}/stripe`}>
            Connect Stripe Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasRequirements = status.requirements && (
    status.requirements.currently_due.length > 0 ||
    status.requirements.past_due.length > 0
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Stripe Account Status</CardTitle>
            <CardDescription>
              Payment processing for {communityName}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Connection</span>
          </div>
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Connected
          </Badge>
        </div>

        {/* Charges Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Accept Payments</span>
          </div>
          {status.chargesEnabled ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Enabled
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" />
              Disabled
            </Badge>
          )}
        </div>

        {/* Payouts Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Receive Payouts</span>
          </div>
          {status.payoutsEnabled ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Enabled
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" />
              Disabled
            </Badge>
          )}
        </div>

        {/* Account Details */}
        {status.country && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Country</span>
            <span>{status.country}</span>
          </div>
        )}

        {status.defaultCurrency && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Default Currency</span>
            <span className="uppercase">{status.defaultCurrency}</span>
          </div>
        )}

        {/* Requirements Alert */}
        {hasRequirements && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Additional information is needed to enable all features.
              </p>
              {status.requirements.past_due.length > 0 && (
                <div className="mb-2">
                  <strong>Past due:</strong>
                  <ul className="list-disc list-inside text-sm">
                    {status.requirements.past_due.map((req) => (
                      <li key={req}>{req.replace(/_/g, " ")}</li>
                    ))}
                  </ul>
                </div>
              )}
              {status.requirements.currently_due.length > 0 && (
                <div>
                  <strong>Required:</strong>
                  <ul className="list-disc list-inside text-sm">
                    {status.requirements.currently_due.map((req) => (
                      <li key={req}>{req.replace(/_/g, " ")}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Button
                className="mt-3"
                size="sm"
                onClick={handleContinueOnboarding}
              >
                Continue Setup
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Test Mode Notice */}
        {status.stripeAccountId?.startsWith("acct_test_") && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Test Mode</AlertTitle>
            <AlertDescription>
              This is a test Stripe account. Real payments won't be processed.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}