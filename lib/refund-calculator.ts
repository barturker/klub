import { dinero, Dinero } from "dinero.js";
import { USD } from "@dinero.js/currencies";

/**
 * Refund calculation utilities using Dinero.js for precise monetary arithmetic
 * Handles platform fee calculations and partial refunds
 */

export interface OrderBreakdown {
  ticketPrice: number; // cents - base ticket price
  platformFee: number; // cents - platform fee charged to buyer
  stripeFee: number; // cents - Stripe processing fee
  buyerTotal: number; // cents - total amount buyer paid
}

export interface RefundBreakdown {
  ticketRefund: number; // cents - ticket price refund
  platformFeeRefund: number; // cents - platform fee refund
  totalRefund: number; // cents - total refund to buyer
  organzerImpact: number; // cents - impact on organizer payout
}

/**
 * Calculate order breakdown from ticket price using the fee structure
 */
export function calculateOrderBreakdown(ticketPriceCents: number): OrderBreakdown {
  const ticketPrice = dinero({ amount: ticketPriceCents, currency: USD });

  // Platform fee: 5.9% + $0.99 (from story fee structure)
  const platformFeePercentage = 0.059;
  const platformFeeFixed = dinero({ amount: 99, currency: USD }); // $0.99

  const platformFeeVariable = ticketPrice.multiply(platformFeePercentage);
  const platformFee = platformFeeVariable.add(platformFeeFixed);

  // Buyer total = ticket price + platform fee
  const buyerTotal = ticketPrice.add(platformFee);

  // Stripe fee: 2.9% + $0.30 on the total transaction (charged to platform)
  const stripeFeePercentage = 0.029;
  const stripeFeeFixed = dinero({ amount: 30, currency: USD }); // $0.30

  const stripeFeeVariable = buyerTotal.multiply(stripeFeePercentage);
  // Round up Stripe fees as per their standard practice
  const stripeFee = stripeFeeVariable.add(stripeFeeFixed);

  return {
    ticketPrice: ticketPrice.getAmount(),
    platformFee: platformFee.getAmount(),
    stripeFee: stripeFee.getAmount(),
    buyerTotal: buyerTotal.getAmount(),
  };
}

/**
 * Calculate refund breakdown for full or partial refunds
 */
export function calculateRefundBreakdown(
  orderBreakdown: OrderBreakdown,
  refundAmountCents: number,
  isFullRefund: boolean = false
): RefundBreakdown {
  const totalPaid = dinero({ amount: orderBreakdown.buyerTotal, currency: USD });
  const refundAmount = dinero({ amount: refundAmountCents, currency: USD });

  // Calculate refund ratio
  const refundRatio = refundAmount.divide(totalPaid.getAmount()).getAmount() / 100;

  let ticketRefund: Dinero<number>;
  let platformFeeRefund: Dinero<number>;

  if (isFullRefund || refundRatio >= 1) {
    // Full refund - return everything to buyer
    ticketRefund = dinero({ amount: orderBreakdown.ticketPrice, currency: USD });
    platformFeeRefund = dinero({ amount: orderBreakdown.platformFee, currency: USD });
  } else {
    // Partial refund - calculate proportional amounts
    ticketRefund = dinero({ amount: orderBreakdown.ticketPrice, currency: USD })
      .multiply(refundRatio);
    platformFeeRefund = dinero({ amount: orderBreakdown.platformFee, currency: USD })
      .multiply(refundRatio);
  }

  const totalRefund = ticketRefund.add(platformFeeRefund);

  // Organizer impact is the ticket refund amount (they keep what's not refunded)
  const organzerImpact = ticketRefund;

  return {
    ticketRefund: ticketRefund.getAmount(),
    platformFeeRefund: platformFeeRefund.getAmount(),
    totalRefund: totalRefund.getAmount(),
    organzerImpact: organzerImpact.getAmount(),
  };
}

/**
 * Validate refund amount against order limits
 */
export function validateRefundAmount(
  orderBreakdown: OrderBreakdown,
  refundAmountCents: number,
  alreadyRefundedCents: number = 0
): { isValid: boolean; error?: string; maxRefundable: number } {
  const maxRefundable = orderBreakdown.buyerTotal - alreadyRefundedCents;

  if (refundAmountCents <= 0) {
    return {
      isValid: false,
      error: "Refund amount must be greater than zero",
      maxRefundable,
    };
  }

  if (refundAmountCents > maxRefundable) {
    return {
      isValid: false,
      error: `Refund amount exceeds maximum refundable amount of $${(maxRefundable / 100).toFixed(2)}`,
      maxRefundable,
    };
  }

  return { isValid: true, maxRefundable };
}

/**
 * Calculate platform's financial impact from a refund
 * Used for internal tracking and analytics
 */
export function calculatePlatformImpact(
  orderBreakdown: OrderBreakdown,
  refundBreakdown: RefundBreakdown
): {
  platformFeeLoss: number; // cents - platform fee refunded to buyer
  stripeFeeImpact: number; // cents - Stripe fees on the refund transaction
  netPlatformImpact: number; // cents - total impact to platform
} {
  const platformFeeLoss = refundBreakdown.platformFeeRefund;

  // Stripe doesn't charge fees on refunds, but we lose the revenue
  // from the original platform fee
  const stripeFeeImpact = 0; // No additional Stripe fees on refunds

  const netPlatformImpact = platformFeeLoss + stripeFeeImpact;

  return {
    platformFeeLoss,
    stripeFeeImpact,
    netPlatformImpact,
  };
}

/**
 * Format monetary amounts for display
 */
export function formatRefundAmount(amountCents: number): string {
  const amount = dinero({ amount: amountCents, currency: USD });
  return amount.toFormat("$0,0.00");
}

/**
 * Check if an order is eligible for refund based on refund policy
 */
export function checkRefundEligibility(
  eventDate: Date,
  refundPolicy?: {
    deadline_hours: number;
    refund_percentage: number;
    no_refund_after?: Date;
  }
): {
  isEligible: boolean;
  reason?: string;
  refundPercentage: number;
} {
  const now = new Date();

  // Default policy: 100% refund up to 24 hours before event
  const policy = refundPolicy || {
    deadline_hours: 24,
    refund_percentage: 100,
  };

  // Check if past the no-refund-after date
  if (policy.no_refund_after && now > policy.no_refund_after) {
    return {
      isEligible: false,
      reason: "Refund deadline has passed",
      refundPercentage: 0,
    };
  }

  // Check if within the deadline
  const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilEvent < policy.deadline_hours) {
    return {
      isEligible: false,
      reason: `Refunds must be requested at least ${policy.deadline_hours} hours before the event`,
      refundPercentage: 0,
    };
  }

  return {
    isEligible: true,
    refundPercentage: policy.refund_percentage,
  };
}

// === ORDER MODIFICATION UTILITIES ===

export interface TicketTier {
  id: string;
  name: string;
  price_cents: number;
  max_quantity?: number;
  sold_quantity?: number;
}

export interface ModificationPricing {
  oldTotal: number; // cents - original total paid by buyer
  newTotal: number; // cents - new total buyer will pay
  priceDifference: number; // cents - difference (positive = charge more, negative = refund)
  oldTicketPrice: number; // cents - original ticket price
  newTicketPrice: number; // cents - new ticket price
  oldPlatformFee: number; // cents - original platform fee
  newPlatformFee: number; // cents - new platform fee
  additionalStripeFee: number; // cents - additional Stripe fees if charging more
}

/**
 * Calculate pricing for upgrading to a different ticket tier
 */
export function calculateUpgradeModification(
  currentTier: TicketTier,
  newTier: TicketTier,
  quantity: number = 1
): ModificationPricing {
  // Calculate original order breakdown
  const oldBreakdown = calculateOrderBreakdown(currentTier.price_cents * quantity);

  // Calculate new order breakdown
  const newBreakdown = calculateOrderBreakdown(newTier.price_cents * quantity);

  const oldTotal = dinero({ amount: oldBreakdown.buyerTotal, currency: USD });
  const newTotal = dinero({ amount: newBreakdown.buyerTotal, currency: USD });

  const priceDifference = newTotal.subtract(oldTotal);

  // Calculate additional Stripe fee if charging more
  let additionalStripeFee = 0;
  if (priceDifference.getAmount() > 0) {
    // 2.9% + $0.30 on the additional amount
    const stripeFeePercentage = 0.029;
    const stripeFeeFixed = dinero({ amount: 30, currency: USD }); // $0.30

    const stripeFeeVariable = priceDifference.multiply(stripeFeePercentage);
    additionalStripeFee = stripeFeeVariable.add(stripeFeeFixed).getAmount();
  }

  return {
    oldTotal: oldBreakdown.buyerTotal,
    newTotal: newBreakdown.buyerTotal,
    priceDifference: priceDifference.getAmount(),
    oldTicketPrice: oldBreakdown.ticketPrice,
    newTicketPrice: newBreakdown.ticketPrice,
    oldPlatformFee: oldBreakdown.platformFee,
    newPlatformFee: newBreakdown.platformFee,
    additionalStripeFee,
  };
}

/**
 * Calculate pricing for downgrading to a different ticket tier
 */
export function calculateDowngradeModification(
  currentTier: TicketTier,
  newTier: TicketTier,
  quantity: number = 1
): ModificationPricing {
  // Same calculation as upgrade, but the difference will be negative
  return calculateUpgradeModification(currentTier, newTier, quantity);
}

/**
 * Calculate pricing for changing quantity (same tier)
 */
export function calculateQuantityModification(
  tier: TicketTier,
  oldQuantity: number,
  newQuantity: number
): ModificationPricing {
  // Calculate original order breakdown
  const oldBreakdown = calculateOrderBreakdown(tier.price_cents * oldQuantity);

  // Calculate new order breakdown
  const newBreakdown = calculateOrderBreakdown(tier.price_cents * newQuantity);

  const oldTotal = dinero({ amount: oldBreakdown.buyerTotal, currency: USD });
  const newTotal = dinero({ amount: newBreakdown.buyerTotal, currency: USD });

  const priceDifference = newTotal.subtract(oldTotal);

  // Calculate additional Stripe fee if charging more
  let additionalStripeFee = 0;
  if (priceDifference.getAmount() > 0) {
    const stripeFeePercentage = 0.029;
    const stripeFeeFixed = dinero({ amount: 30, currency: USD });

    const stripeFeeVariable = priceDifference.multiply(stripeFeePercentage);
    additionalStripeFee = stripeFeeVariable.add(stripeFeeFixed).getAmount();
  }

  return {
    oldTotal: oldBreakdown.buyerTotal,
    newTotal: newBreakdown.buyerTotal,
    priceDifference: priceDifference.getAmount(),
    oldTicketPrice: oldBreakdown.ticketPrice,
    newTicketPrice: newBreakdown.ticketPrice,
    oldPlatformFee: oldBreakdown.platformFee,
    newPlatformFee: newBreakdown.platformFee,
    additionalStripeFee,
  };
}

/**
 * Validate order modification constraints
 */
export function validateOrderModification(
  modificationType: "upgrade" | "downgrade" | "quantity_change",
  currentTier: TicketTier,
  newTier?: TicketTier,
  newQuantity?: number,
  eventDate?: Date
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const now = new Date();

  // Check if modification is allowed close to event date
  if (eventDate) {
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilEvent < 6) { // 6 hours deadline for modifications
      errors.push("Order modifications must be made at least 6 hours before the event");
    } else if (hoursUntilEvent < 24) {
      warnings.push("Modifications close to the event date may be subject to additional fees");
    }
  }

  // Validate tier change
  if ((modificationType === "upgrade" || modificationType === "downgrade") && newTier) {
    // Check availability for upgrades
    if (modificationType === "upgrade") {
      const availableQuantity = (newTier.max_quantity || Infinity) - (newTier.sold_quantity || 0);
      if (availableQuantity <= 0) {
        errors.push(`${newTier.name} tier is sold out`);
      }
    }

    // Check if tiers are actually different
    if (newTier.id === currentTier.id) {
      errors.push("Cannot modify to the same tier");
    }
  }

  // Validate quantity change
  if (modificationType === "quantity_change" && newQuantity !== undefined) {
    if (newQuantity < 1) {
      errors.push("Quantity must be at least 1");
    }

    const availableQuantity = (currentTier.max_quantity || Infinity) - (currentTier.sold_quantity || 0);
    if (newQuantity > availableQuantity) {
      errors.push(`Only ${availableQuantity} tickets available for ${currentTier.name}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format modification pricing for display
 */
export function formatModificationPricing(pricing: ModificationPricing): {
  oldTotalFormatted: string;
  newTotalFormatted: string;
  priceDifferenceFormatted: string;
  isUpgrade: boolean;
  isDowngrade: boolean;
} {
  const oldTotal = dinero({ amount: pricing.oldTotal, currency: USD });
  const newTotal = dinero({ amount: pricing.newTotal, currency: USD });
  const priceDifference = dinero({ amount: Math.abs(pricing.priceDifference), currency: USD });

  const isUpgrade = pricing.priceDifference > 0;
  const isDowngrade = pricing.priceDifference < 0;

  return {
    oldTotalFormatted: oldTotal.toFormat("$0,0.00"),
    newTotalFormatted: newTotal.toFormat("$0,0.00"),
    priceDifferenceFormatted: priceDifference.toFormat("$0,0.00"),
    isUpgrade,
    isDowngrade,
  };
}

/**
 * Calculate organizer impact from order modification
 */
export function calculateOrganizerModificationImpact(
  pricing: ModificationPricing
): {
  ticketRevenueChange: number; // cents - change in ticket revenue to organizer
  platformFeeChange: number; // cents - change in platform fees
  organizerNetChange: number; // cents - net change to organizer
} {
  const ticketRevenueChange = pricing.newTicketPrice - pricing.oldTicketPrice;
  const platformFeeChange = pricing.newPlatformFee - pricing.oldPlatformFee;

  // Organizer receives the ticket price, platform keeps the fees
  const organizerNetChange = ticketRevenueChange;

  return {
    ticketRevenueChange,
    platformFeeChange,
    organizerNetChange,
  };
}