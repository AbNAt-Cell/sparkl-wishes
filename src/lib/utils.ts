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

/**
 * Format currency with proper thousand separators and decimals
 */
export function formatCurrency(amount: number, currency: string = "USD", showDecimals: boolean = true): string {
  const symbol = getCurrencySymbol(currency);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
  return `${symbol}${formatted}`;
}

/**
 * Format date in a user-friendly way
 */
export function formatDate(date: string | Date, format: 'short' | 'long' | 'relative' = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'relative') {
    const now = new Date();
    const diff = dateObj.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'Past event';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days <= 7) return `In ${days} days`;
    if (days <= 30) return `In ${Math.ceil(days / 7)} weeks`;
    return `In ${Math.ceil(days / 30)} months`;
  }
  
  if (format === 'long') {
    return dateObj.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  
  return dateObj.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Format large numbers with K, M suffixes
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
