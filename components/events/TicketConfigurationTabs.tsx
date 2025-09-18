"use client";

import { useState } from "react";
import { Plus, Trash2, Info, Copy, Percent, DollarSign, Users, Calendar, Tag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Currency } from "@/lib/types/tickets";

interface TicketTier {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description: string;
  salesStartDate?: string;
  salesEndDate?: string;
  minPerOrder?: number;
  maxPerOrder?: number;
}

interface DiscountCode {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  usageLimit?: number;
  validFrom?: string;
  validUntil?: string;
  minPurchase?: number;
  applicableTiers?: string[];
}

interface TicketConfigurationTabsProps {
  currency: Currency;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

export function TicketConfigurationTabs({ currency, data, onChange }: TicketConfigurationTabsProps) {
  // Ticket Tiers State
  const [tiers, setTiers] = useState<TicketTier[]>(
    (data.ticket_tiers as TicketTier[]) || [
      {
        id: "default",
        name: "General Admission",
        price: 0,
        quantity: 100,
        description: "",
      },
    ]
  );

  // Discount Codes State
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>(
    (data.discount_codes as DiscountCode[]) || []
  );

  // Free Event State
  const [enableFreeTickets, setEnableFreeTickets] = useState(
    (data.enable_free_tickets as boolean) || false
  );

  // Test Purchase State for Preview
  const [testPurchase, setTestPurchase] = useState({
    selectedTier: "",
    quantity: 1,
    discountCode: "",
  });

  const getCurrencySymbol = (curr: Currency): string => {
    const symbols: Record<Currency, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      TRY: "₺",
      JPY: "¥",
    };
    return symbols[curr];
  };

  // Tier Management Functions
  const handleTierChange = (index: number, field: keyof TicketTier, value: any) => {
    const newTiers = [...tiers];
    newTiers[index] = {
      ...newTiers[index],
      [field]: field === "price" || field === "quantity" ? Number(value) : value,
    };
    setTiers(newTiers);
    onChange({ ...data, ticket_tiers: newTiers });
  };

  const addTier = () => {
    const newTier: TicketTier = {
      id: `tier-${Date.now()}`,
      name: "",
      price: 0,
      quantity: 100,
      description: "",
    };
    const newTiers = [...tiers, newTier];
    setTiers(newTiers);
    onChange({ ...data, ticket_tiers: newTiers });
  };

  const removeTier = (index: number) => {
    if (tiers.length > 1) {
      const newTiers = tiers.filter((_, i) => i !== index);
      setTiers(newTiers);
      onChange({ ...data, ticket_tiers: newTiers });
    }
  };

  // Discount Code Management Functions
  const addDiscountCode = () => {
    const newCode: DiscountCode = {
      id: `discount-${Date.now()}`,
      code: "",
      type: "percentage",
      value: 10,
      usageLimit: 100,
    };
    const newCodes = [...discountCodes, newCode];
    setDiscountCodes(newCodes);
    onChange({ ...data, discount_codes: newCodes });
  };

  const removeDiscountCode = (index: number) => {
    const newCodes = discountCodes.filter((_, i) => i !== index);
    setDiscountCodes(newCodes);
    onChange({ ...data, discount_codes: newCodes });
  };

  const handleDiscountChange = (index: number, field: keyof DiscountCode, value: any) => {
    const newCodes = [...discountCodes];
    newCodes[index] = {
      ...newCodes[index],
      [field]: value,
    };
    setDiscountCodes(newCodes);
    onChange({ ...data, discount_codes: newCodes });
  };

  // Calculate test purchase total
  const calculateTestTotal = () => {
    if (!testPurchase.selectedTier) return 0;

    const tier = tiers.find(t => t.id === testPurchase.selectedTier);
    if (!tier) return 0;

    let total = tier.price * testPurchase.quantity;

    // Apply discount if code is entered
    if (testPurchase.discountCode) {
      const discount = discountCodes.find(
        d => d.code.toLowerCase() === testPurchase.discountCode.toLowerCase()
      );

      if (discount) {
        if (discount.type === "percentage") {
          total = total * (1 - discount.value / 100);
        } else {
          total = Math.max(0, total - discount.value);
        }
      }
    }

    return total;
  };

  const handleFreeTicketsToggle = (enabled: boolean) => {
    setEnableFreeTickets(enabled);
    if (enabled) {
      // Set all prices to 0 for free event
      const freeTiers = tiers.map((tier) => ({ ...tier, price: 0 }));
      setTiers(freeTiers);
      onChange({ ...data, ticket_tiers: freeTiers, enable_free_tickets: true });
    } else {
      onChange({ ...data, enable_free_tickets: false });
    }
  };

  return (
    <div className="space-y-6">
      {/* Free Event Toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          id="free-tickets"
          checked={enableFreeTickets}
          onCheckedChange={handleFreeTicketsToggle}
        />
        <Label htmlFor="free-tickets">This is a free event</Label>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tiers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tiers">Ticket Tiers</TabsTrigger>
          <TabsTrigger value="discounts">Discount Codes</TabsTrigger>
          <TabsTrigger value="preview">Preview & Test</TabsTrigger>
        </TabsList>

        {/* Ticket Tiers Tab */}
        <TabsContent value="tiers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Ticket Tiers</h3>
              <p className="text-sm text-muted-foreground">
                Create different ticket types with their own pricing and availability
              </p>
            </div>
            <Button onClick={addTier} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Tier
            </Button>
          </div>

          {tiers.map((tier, index) => (
            <Card key={tier.id}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {tier.name || `Ticket Tier ${index + 1}`}
                  </CardTitle>
                  {tiers.length > 1 && (
                    <Button
                      onClick={() => removeTier(index)}
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`name-${index}`}>Tier Name *</Label>
                    <Input
                      id={`name-${index}`}
                      placeholder="e.g., Early Bird, VIP, General"
                      value={tier.name}
                      onChange={(e) => handleTierChange(index, "name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`price-${index}`}>
                      Price ({getCurrencySymbol(currency)}) *
                    </Label>
                    <Input
                      id={`price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={tier.price}
                      onChange={(e) => handleTierChange(index, "price", e.target.value)}
                      disabled={enableFreeTickets}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`quantity-${index}`}>Available Tickets *</Label>
                    <Input
                      id={`quantity-${index}`}
                      type="number"
                      min="1"
                      placeholder="100"
                      value={tier.quantity}
                      onChange={(e) => handleTierChange(index, "quantity", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`max-per-order-${index}`}>Max Per Order</Label>
                    <Input
                      id={`max-per-order-${index}`}
                      type="number"
                      min="1"
                      placeholder="10"
                      value={tier.maxPerOrder || ""}
                      onChange={(e) => handleTierChange(index, "maxPerOrder", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`description-${index}`}>Description</Label>
                  <Input
                    id={`description-${index}`}
                    placeholder="What's included with this ticket?"
                    value={tier.description}
                    onChange={(e) => handleTierChange(index, "description", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`sales-start-${index}`}>Sales Start Date</Label>
                    <Input
                      id={`sales-start-${index}`}
                      type="datetime-local"
                      value={tier.salesStartDate || ""}
                      onChange={(e) => handleTierChange(index, "salesStartDate", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`sales-end-${index}`}>Sales End Date</Label>
                    <Input
                      id={`sales-end-${index}`}
                      type="datetime-local"
                      value={tier.salesEndDate || ""}
                      onChange={(e) => handleTierChange(index, "salesEndDate", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Discount Codes Tab */}
        <TabsContent value="discounts" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Discount Codes</h3>
              <p className="text-sm text-muted-foreground">
                Create promo codes for special offers and early bird discounts
              </p>
            </div>
            <Button onClick={addDiscountCode} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Code
            </Button>
          </div>

          {discountCodes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No discount codes created yet. Click "Add Code" to create your first discount.
                </p>
              </CardContent>
            </Card>
          ) : (
            discountCodes.map((discount, index) => (
              <Card key={discount.id}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {discount.code || `Discount Code ${index + 1}`}
                    </CardTitle>
                    <Button
                      onClick={() => removeDiscountCode(index)}
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`code-${index}`}>Promo Code *</Label>
                      <Input
                        id={`code-${index}`}
                        placeholder="e.g., EARLYBIRD, SUMMER20"
                        value={discount.code}
                        onChange={(e) => handleDiscountChange(index, "code", e.target.value.toUpperCase())}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`discount-type-${index}`}>Discount Type *</Label>
                      <Select
                        value={discount.type}
                        onValueChange={(value) => handleDiscountChange(index, "type", value)}
                      >
                        <SelectTrigger id={`discount-type-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`discount-value-${index}`}>
                        {discount.type === "percentage" ? "Percentage Off (%)" : `Amount Off (${getCurrencySymbol(currency)})`}
                      </Label>
                      <Input
                        id={`discount-value-${index}`}
                        type="number"
                        min="0"
                        max={discount.type === "percentage" ? "100" : undefined}
                        step={discount.type === "percentage" ? "1" : "0.01"}
                        value={discount.value}
                        onChange={(e) => handleDiscountChange(index, "value", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`usage-limit-${index}`}>Usage Limit</Label>
                      <Input
                        id={`usage-limit-${index}`}
                        type="number"
                        min="1"
                        placeholder="100"
                        value={discount.usageLimit || ""}
                        onChange={(e) => handleDiscountChange(index, "usageLimit", e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`valid-from-${index}`}>Valid From</Label>
                      <Input
                        id={`valid-from-${index}`}
                        type="datetime-local"
                        value={discount.validFrom || ""}
                        onChange={(e) => handleDiscountChange(index, "validFrom", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`valid-until-${index}`}>Valid Until</Label>
                      <Input
                        id={`valid-until-${index}`}
                        type="datetime-local"
                        value={discount.validUntil || ""}
                        onChange={(e) => handleDiscountChange(index, "validUntil", e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`min-purchase-${index}`}>
                      Minimum Purchase ({getCurrencySymbol(currency)})
                    </Label>
                    <Input
                      id={`min-purchase-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Optional"
                      value={discount.minPurchase || ""}
                      onChange={(e) => handleDiscountChange(index, "minPurchase", e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Preview & Test Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Purchase Preview</CardTitle>
              <CardDescription>
                Test how your ticket configuration will appear to attendees
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Ticket Selection */}
              <div>
                <Label htmlFor="test-tier">Select Ticket Tier</Label>
                <Select
                  value={testPurchase.selectedTier}
                  onValueChange={(value) => setTestPurchase({ ...testPurchase, selectedTier: value })}
                >
                  <SelectTrigger id="test-tier">
                    <SelectValue placeholder="Choose a ticket tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiers.map((tier) => (
                      <SelectItem key={tier.id} value={tier.id}>
                        <div className="flex justify-between items-center w-full">
                          <span>{tier.name}</span>
                          <Badge variant="secondary" className="ml-2">
                            {getCurrencySymbol(currency)}{tier.price}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div>
                <Label htmlFor="test-quantity">Quantity</Label>
                <Input
                  id="test-quantity"
                  type="number"
                  min="1"
                  max="10"
                  value={testPurchase.quantity}
                  onChange={(e) => setTestPurchase({ ...testPurchase, quantity: Number(e.target.value) })}
                />
              </div>

              {/* Discount Code */}
              {discountCodes.length > 0 && (
                <div>
                  <Label htmlFor="test-discount">Discount Code (Optional)</Label>
                  <Input
                    id="test-discount"
                    placeholder="Enter promo code"
                    value={testPurchase.discountCode}
                    onChange={(e) => setTestPurchase({ ...testPurchase, discountCode: e.target.value })}
                  />
                  <div className="mt-2 text-sm text-muted-foreground">
                    Available codes: {discountCodes.map(d => d.code).join(", ")}
                  </div>
                </div>
              )}

              {/* Price Breakdown */}
              {testPurchase.selectedTier && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>
                        {getCurrencySymbol(currency)}
                        {(tiers.find(t => t.id === testPurchase.selectedTier)?.price || 0) * testPurchase.quantity}
                      </span>
                    </div>
                    {testPurchase.discountCode && discountCodes.find(d => d.code.toLowerCase() === testPurchase.discountCode.toLowerCase()) && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount Applied</span>
                        <span>
                          -{getCurrencySymbol(currency)}
                          {((tiers.find(t => t.id === testPurchase.selectedTier)?.price || 0) * testPurchase.quantity) - calculateTestTotal()}
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>
                        {getCurrencySymbol(currency)}
                        {calculateTestTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Ticket Tiers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{tiers.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {tiers.reduce((sum, tier) => sum + tier.quantity, 0)} total tickets
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Active Discount Codes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{discountCodes.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {discountCodes.filter(d => d.type === "percentage").length} percentage,{" "}
                      {discountCodes.filter(d => d.type === "fixed").length} fixed
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}