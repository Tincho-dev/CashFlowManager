/**
 * Financial utility functions for consistent calculations across the application
 */

/**
 * Rounds a number to 2 decimal places for financial calculations
 * @param value - The number to round
 * @returns The rounded number
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Converts an interest rate from percentage (e.g., 5 for 5%) to decimal (e.g., 0.05)
 * @param percentRate - The interest rate as a percentage
 * @returns The interest rate as a decimal
 */
export function percentToDecimal(percentRate: number): number {
  return percentRate / 100;
}

/**
 * Converts an interest rate from decimal (e.g., 0.05) to percentage (e.g., 5)
 * @param decimalRate - The interest rate as a decimal
 * @returns The interest rate as a percentage
 */
export function decimalToPercent(decimalRate: number): number {
  return decimalRate * 100;
}
