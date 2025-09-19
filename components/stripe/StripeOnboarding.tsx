"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, CheckCircle, AlertCircle, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";

interface StripeOnboardingProps {
  communityId: string;
  communityName: string;
  onComplete?: () => void;
}

export function StripeOnboarding({
  communityId,
  communityName,
  onComplete,
}: StripeOnboardingProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartOnboarding = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          community_id: communityId,
          return_url: `${window.location.origin}/communities/${communityId}/stripe/return`,
          refresh_url: `${window.location.origin}/communities/${communityId}/stripe/refresh`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start Stripe onboarding");
      }

      if (data.onboarding_completed) {
        // Already onboarded
        onComplete?.();
      } else if (data.onboarding_url) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboarding_url;
      }
    } catch (err) {
      console.error("Onboarding error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          <CardTitle>Accept Payments with Stripe</CardTitle>
        </div>
        <CardDescription>
          Set up Stripe to accept payments for {communityName} events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Benefits */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Why connect with Stripe?</h3>
          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <strong>Accept payments globally</strong> - Support for 135+ currencies and
                all major payment methods
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <strong>Fast payouts</strong> - Get paid directly to your bank account
                with instant payout options
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <strong>Secure & compliant</strong> - PCI-compliant payment processing
                with fraud protection
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <strong>Transparent pricing</strong> - 2.9% + 30¢ payment processing
                + 3% platform fee
              </div>
            </div>
          </div>
        </div>

        {/* Test Mode Notice */}
        {process.env.NODE_ENV === "development" && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Test Mode</AlertTitle>
            <AlertDescription>
              You're in test mode. Use test data during onboarding.
              Real payments won't be processed.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Requirements */}
        <div className="rounded-lg border p-4 bg-muted/30">
          <h4 className="text-sm font-medium mb-2">What you'll need:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Business information (name, address, website)</li>
            <li>• Tax ID or Social Security Number</li>
            <li>• Bank account details for payouts</li>
            <li>• Contact information</li>
          </ul>
        </div>

        {/* CTA Button */}
        <div className="flex flex-col gap-4">
          <Button
            onClick={handleStartOnboarding}
            disabled={isLoading}
            size="lg"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting onboarding...
              </>
            ) : (
              <>
                Connect with Stripe
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By connecting, you agree to Stripe's{" "}
            <a
              href="https://stripe.com/connect/legal"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Connected Account Agreement
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}