import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    NGN: "₦",
    ZAR: "R",
    KES: "KSh",
    GHS: "₵",
    CAD: "C$",
    AUD: "A$",
    INR: "₹",
    CNY: "¥",
    BRL: "R$",
  };
  return symbols[currencyCode] || currencyCode;
}

// Claim status utilities
export interface ClaimData {
  id: string;
  claimer_name: string | null;
  is_anonymous: boolean | null;
  payment_status: string | null;
}

/**
 * Normalizes claims data to always be an array
 */
export function normalizeClaims(claims: any): ClaimData[] {
  if (!claims) return [];
  return Array.isArray(claims) ? claims : [claims];
}

/**
 * Checks if an item is truly claimed (payment completed or not required)
 */
export function isItemClaimed(claims: any): boolean {
  const claimsList = normalizeClaims(claims);
  return claimsList.some(
    (claim) => 
      claim.payment_status === 'completed' || 
      claim.payment_status === 'not_required'
  );
}

/**
 * Gets the completed claim info for display
 */
export function getCompletedClaim(claims: any): ClaimData | null {
  const claimsList = normalizeClaims(claims);
  return claimsList.find(
    (claim) => 
      claim.payment_status === 'completed' || 
      claim.payment_status === 'not_required'
  ) || null;
}
