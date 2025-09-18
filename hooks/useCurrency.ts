/**
 * Currency operations with Dinero.js
 * Handles formatting, conversion, and ISO 4217 compliance
 */

import { dinero, add, subtract, multiply, toUnit, Dinero } from 'dinero.js';
import { TRY, USD, EUR, GBP, JPY } from '@dinero.js/currencies';
import type { Currency } from '@/lib/types/tickets';

// Map our currency codes to Dinero.js currency objects
const CURRENCY_MAP = {
  USD,
  EUR,
  GBP,
  TRY,
  JPY,
} as const;

// Currency formatter configurations
const FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  USD: new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }),
  EUR: new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }),
  GBP: new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }),
  TRY: new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }),
  JPY: new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }),
};

export function useCurrency() {
  /**
   * Create a Dinero object from amount in minor units
   */
  const createMoney = (amountInCents: number, currency: Currency) => {
    return dinero({
      amount: amountInCents,
      currency: CURRENCY_MAP[currency],
    });
  };

  /**
   * Format money for display
   */
  const formatMoney = (amountInCents: number, currency: Currency): string => {
    const money = createMoney(amountInCents, currency);
    const value = toUnit(money);
    return FORMATTERS[currency].format(value);
  };

  /**
   * Calculate platform fee (3% of amount)
   */
  const calculatePlatformFee = (
    amountInCents: number,
    currency: Currency
  ): Dinero<number> => {
    const money = createMoney(amountInCents, currency);
    // 3% platform fee
    return multiply(money, { amount: 3, scale: 2 });
  };

  /**
   * Calculate Stripe fee (2.9% + 30 cents/equivalent)
   */
  const calculateStripeFee = (
    amountInCents: number,
    currency: Currency
  ): Dinero<number> => {
    const money = createMoney(amountInCents, currency);

    // 2.9% percentage fee
    const percentageFee = multiply(money, { amount: 29, scale: 3 });

    // Fixed fee varies by currency
    const fixedFeeMap: Record<Currency, number> = {
      USD: 30, // 30 cents
      EUR: 25, // 25 cents
      GBP: 20, // 20 pence
      TRY: 100, // 1 TRY
      JPY: 30, // 30 yen (no decimals in JPY)
    };

    const fixedFee = createMoney(fixedFeeMap[currency], currency);

    return add(percentageFee, fixedFee);
  };

  /**
   * Calculate total fees (platform + Stripe)
   */
  const calculateTotalFees = (
    amountInCents: number,
    currency: Currency
  ): number => {
    const platformFee = calculatePlatformFee(amountInCents, currency);
    const stripeFee = calculateStripeFee(amountInCents, currency);
    const totalFees = add(platformFee, stripeFee);

    // Return as integer cents
    return totalFees.toJSON().amount;
  };

  /**
   * Apply percentage discount
   */
  const applyPercentageDiscount = (
    amountInCents: number,
    discountPercentage: number,
    currency: Currency
  ): Dinero<number> => {
    const money = createMoney(amountInCents, currency);
    const discount = multiply(money, {
      amount: discountPercentage,
      scale: 2,
    });
    return subtract(money, discount);
  };

  /**
   * Apply fixed discount
   */
  const applyFixedDiscount = (
    amountInCents: number,
    discountAmountInCents: number,
    currency: Currency
  ): Dinero<number> => {
    const money = createMoney(amountInCents, currency);
    const discount = createMoney(discountAmountInCents, currency);

    // Ensure discount doesn't exceed the amount
    const result = subtract(money, discount);

    // If result is negative, return zero
    if (result.toJSON().amount < 0) {
      return createMoney(0, currency);
    }

    return result;
  };

  /**
   * Calculate group pricing discount
   */
  const calculateGroupDiscount = (
    pricePerTicket: number,
    quantity: number,
    discountPercentage: number,
    currency: Currency
  ): number => {
    const subtotal = pricePerTicket * quantity;
    const money = createMoney(subtotal, currency);
    const discount = multiply(money, {
      amount: discountPercentage,
      scale: 2,
    });

    return discount.toJSON().amount;
  };

  /**
   * Convert between major and minor units
   */
  const toMinorUnits = (amount: number, currency: Currency): number => {
    // Handle currencies with different scales
    if (currency === 'JPY') {
      // JPY has no decimal places
      return Math.round(amount);
    }
    // Default to 2 decimal places
    return Math.round(amount * 100);
  };

  const toMajorUnits = (amountInCents: number, currency: Currency): number => {
    const money = createMoney(amountInCents, currency);
    return toUnit(money);
  };

  /**
   * Get currency symbol
   */
  const getCurrencySymbol = (currency: Currency): string => {
    const symbols: Record<Currency, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      TRY: '₺',
      JPY: '¥',
    };
    return symbols[currency];
  };

  return {
    createMoney,
    formatMoney,
    calculatePlatformFee,
    calculateStripeFee,
    calculateTotalFees,
    applyPercentageDiscount,
    applyFixedDiscount,
    calculateGroupDiscount,
    toMinorUnits,
    toMajorUnits,
    getCurrencySymbol,
  };
}