"use client";

import { useState } from "react";
import { Plus, Trash2, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import type { Currency } from "@/lib/types/tickets";

interface TicketTier {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description: string;
}

interface BasicTicketSetupProps {
  currency: Currency;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

export function BasicTicketSetup({ currency, data, onChange }: BasicTicketSetupProps) {
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

  const [enableFreeTickets, setEnableFreeTickets] = useState(
    (data.enable_free_tickets as boolean) || false
  );

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

  const handleTierChange = (index: number, field: keyof TicketTier, value: string | number) => {
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
      {/* Free Tickets Toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          id="free-tickets"
          checked={enableFreeTickets}
          onCheckedChange={handleFreeTicketsToggle}
        />
        <Label htmlFor="free-tickets">This is a free event</Label>
      </div>

      {/* Ticket Tiers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Ticket Tiers</h3>
          <Button onClick={addTier} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Tier
          </Button>
        </div>

        {tiers.map((tier, index) => (
          <Card key={tier.id}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Ticket Tier {index + 1}</CardTitle>
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
                  <Label htmlFor={`name-${index}`}>Tier Name</Label>
                  <Input
                    id={`name-${index}`}
                    placeholder="e.g., Early Bird, VIP"
                    value={tier.name}
                    onChange={(e) => handleTierChange(index, "name", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`price-${index}`}>
                    Price ({getCurrencySymbol(currency)})
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
              <div>
                <Label htmlFor={`quantity-${index}`}>Available Tickets</Label>
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
                <Label htmlFor={`description-${index}`}>
                  Description (Optional)
                </Label>
                <Input
                  id={`description-${index}`}
                  placeholder="What's included with this ticket?"
                  value={tier.description}
                  onChange={(e) => handleTierChange(index, "description", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          You can add more advanced features after creating the event:
          <ul className="mt-2 ml-4 list-disc text-sm">
            <li>Sales windows (early bird periods)</li>
            <li>Discount codes and promo codes</li>
            <li>Group pricing and bulk discounts</li>
            <li>Refund and transfer policies</li>
            <li>Attendee information requirements</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}