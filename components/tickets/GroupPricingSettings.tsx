"use client";

/**
 * Configure bulk purchase discounts
 */

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  useGroupPricingRules,
  useUpdateGroupPricingRules,
} from "@/hooks/useTicketTiers";
import type { TicketTier, GroupPricingRuleFormData } from "@/lib/types/tickets";

interface GroupPricingSettingsProps {
  tier: TicketTier;
  onClose?: () => void;
}

export function GroupPricingSettings({ tier, onClose }: GroupPricingSettingsProps) {
  const [rules, setRules] = useState<GroupPricingRuleFormData[]>([]);
  const [newMinQuantity, setNewMinQuantity] = useState("");
  const [newDiscountPercentage, setNewDiscountPercentage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: existingRules = [], isLoading } = useGroupPricingRules(tier.id);
  const updateMutation = useUpdateGroupPricingRules();

  useEffect(() => {
    if (existingRules.length > 0) {
      setRules(
        existingRules.map((rule) => ({
          min_quantity: rule.min_quantity,
          discount_percentage: rule.discount_percentage,
        }))
      );
    }
  }, [existingRules]);

  const handleAddRule = () => {
    const minQty = parseInt(newMinQuantity);
    const discountPct = parseInt(newDiscountPercentage);

    if (minQty <= 1) {
      alert("Minimum quantity must be greater than 1");
      return;
    }

    if (discountPct <= 0 || discountPct > 100) {
      alert("Discount percentage must be between 1 and 100");
      return;
    }

    // Check for duplicate
    if (rules.some((r) => r.min_quantity === minQty)) {
      alert("A rule for this quantity already exists");
      return;
    }

    setRules([...rules, { min_quantity: minQty, discount_percentage: discountPct }]);
    setNewMinQuantity("");
    setNewDiscountPercentage("");
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Sort rules by min_quantity for better UX
      const sortedRules = [...rules].sort(
        (a, b) => a.min_quantity - b.min_quantity
      );

      await updateMutation.mutateAsync({
        tierId: tier.id,
        rules: sortedRules,
      });

      onClose?.();
    } catch (error) {
      console.error("Error saving group pricing rules:", error);
      alert("Failed to save group pricing rules. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Loading pricing rules...</div>;
  }

  const sortedRules = [...rules].sort(
    (a, b) => a.min_quantity - b.min_quantity
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Set up automatic discounts based on the number of tickets purchased.
        </p>
      </div>

      {sortedRules.length > 0 && (
        <div>
          <Label className="mb-2 block">Current Rules</Label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Minimum Quantity</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRules.map((rule, index) => (
                <TableRow key={index}>
                  <TableCell>{rule.min_quantity} or more tickets</TableCell>
                  <TableCell>{rule.discount_percentage}% off</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRule(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="space-y-4 rounded-lg border p-4">
        <Label>Add New Rule</Label>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="min-quantity" className="mb-2 block text-sm">
              Minimum Quantity
            </Label>
            <Input
              id="min-quantity"
              type="number"
              min="2"
              placeholder="e.g., 5"
              value={newMinQuantity}
              onChange={(e) => setNewMinQuantity(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="discount" className="mb-2 block text-sm">
              Discount Percentage
            </Label>
            <Input
              id="discount"
              type="number"
              min="1"
              max="100"
              placeholder="e.g., 10"
              value={newDiscountPercentage}
              onChange={(e) => setNewDiscountPercentage(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleAddRule}
              disabled={!newMinQuantity || !newDiscountPercentage}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="mb-2 font-medium">Example Pricing</h4>
          <div className="space-y-1 text-sm">
            <div>1 ticket: ${(tier.price_cents / 100).toFixed(2)}</div>
            {sortedRules.map((rule) => (
              <div key={rule.min_quantity}>
                {rule.min_quantity} tickets:{" "}
                ${(
                  (tier.price_cents * (100 - rule.discount_percentage)) /
                  10000
                ).toFixed(2)}{" "}
                each ({rule.discount_percentage}% off)
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Rules"}
        </Button>
      </div>
    </div>
  );
}