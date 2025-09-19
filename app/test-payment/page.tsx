"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

// Test card numbers for Stripe
const TEST_CARDS = [
  { number: "4242 4242 4242 4242", label: "✅ Success", description: "Always succeeds" },
  { number: "4000 0000 0000 9995", label: "❌ Decline", description: "Always declined" },
  { number: "4000 0027 6000 3184", label: "🔐 3D Secure", description: "Requires authentication" },
  { number: "4000 0000 0000 9979", label: "🏦 Fraud", description: "Marked as fraud" },
];

export default function TestPaymentPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [selectedCard, setSelectedCard] = useState(TEST_CARDS[0].number);
  const [amount, setAmount] = useState("50.00");

  const handleTestPayment = async () => {
    setIsProcessing(true);
    setPaymentStatus("idle");
    setMessage("");

    // Simulate payment processing
    setTimeout(() => {
      if (selectedCard.includes("9995")) {
        setPaymentStatus("error");
        setMessage("Card declined. Please try another card.");
      } else if (selectedCard.includes("3184")) {
        setPaymentStatus("success");
        setMessage("3D Secure authentication completed! Payment successful.");
      } else if (selectedCard.includes("9979")) {
        setPaymentStatus("error");
        setMessage("Payment blocked: Card flagged for fraud.");
      } else {
        setPaymentStatus("success");
        setMessage(`Payment of $${amount} successful! Order ID: ORD-${Date.now()}`);
      }
      setIsProcessing(false);
    }, 2000);
  };

  const calculateFees = (amountStr: string) => {
    const amountNum = parseFloat(amountStr) || 0;
    const platformFee = amountNum * 0.03; // 3% platform fee
    const stripeFee = amountNum * 0.029 + 0.30; // 2.9% + $0.30
    const total = amountNum + platformFee;
    const netAmount = amountNum - platformFee - stripeFee;

    return {
      amount: amountNum.toFixed(2),
      platformFee: platformFee.toFixed(2),
      stripeFee: stripeFee.toFixed(2),
      total: total.toFixed(2),
      netAmount: netAmount.toFixed(2),
    };
  };

  const fees = calculateFees(amount);

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Stripe Test Mode Playground 🎭</h1>
        <p className="text-muted-foreground">
          Test payment flows with fake cards - no real money involved!
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Test Cards Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Test Card</CardTitle>
            <CardDescription>Choose a test card to simulate different scenarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {TEST_CARDS.map((card) => (
              <div
                key={card.number}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedCard === card.number
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedCard(card.number)}
              >
                <div className="font-mono text-lg mb-1">{card.number}</div>
                <div className="text-sm font-semibold">{card.label}</div>
                <div className="text-xs text-muted-foreground">{card.description}</div>
              </div>
            ))}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Use any CVV (e.g., 123) and any future expiry date (e.g., 12/34)
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Test Payment</CardTitle>
            <CardDescription>Simulate a ticket purchase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Event Ticket</Label>
              <div className="text-2xl font-bold">Workshop: Next.js & Stripe</div>
              <div className="text-sm text-muted-foreground">December 25, 2025 • 2:00 PM</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Ticket Price ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50.00"
              />
            </div>

            {/* Fee Breakdown */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Ticket Price:</span>
                <span className="font-medium">${fees.amount}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Platform Fee (3%):</span>
                <span>+${fees.platformFee}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total to Pay:</span>
                <span className="text-lg">${fees.total}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-xs text-muted-foreground">
                <span>Organizer receives (after fees):</span>
                <span>${fees.netAmount}</span>
              </div>
            </div>

            {/* Selected Card Display */}
            <div className="bg-primary/5 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-5 w-5" />
                <span className="font-semibold">Selected Card:</span>
              </div>
              <div className="font-mono">{selectedCard}</div>
            </div>

            {/* Payment Button */}
            <Button
              onClick={handleTestPayment}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay ${fees.total} (Test Mode)
                </>
              )}
            </Button>

            {/* Status Messages */}
            {paymentStatus === "success" && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{message}</AlertDescription>
              </Alert>
            )}

            {paymentStatus === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>🧪 Test Mode Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">What happens in test mode?</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>All payments are simulated - no real money is charged</li>
              <li>You can test different card behaviors (success, decline, 3D Secure)</li>
              <li>Webhooks and emails work just like in production</li>
              <li>All transactions appear in Stripe Dashboard with "TEST" label</li>
              <li>Perfect for development and QA testing</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Next Steps for Real Integration:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Create a Stripe account at stripe.com</li>
              <li>Get your test API keys from the Dashboard</li>
              <li>Add keys to your .env.local file</li>
              <li>Implement Stripe Elements for secure card collection</li>
              <li>Set up webhook handlers for payment events</li>
              <li>Test with real test mode transactions</li>
            </ol>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Note:</strong> Never enter real card details in test mode. Always use
              the provided test card numbers.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}