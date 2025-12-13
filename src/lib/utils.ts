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
  contribution_amount?: number | null;
  is_group_gift?: boolean | null;
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
 * For single gifts: checks if any claim is completed
 * For group gifts: checks if total contributions >= price_max
 */
export function isItemClaimed(claims: any, item?: { price_max?: number | null; allow_group_gifting?: boolean }): boolean {
  const claimsList = normalizeClaims(claims);
  
  if (!claimsList || claimsList.length === 0) {
    return false;
  }
  
  // Check if this is a group gift item
  const hasGroupGiftClaims = claimsList.some(c => c.is_group_gift === true);
  const isGroupGiftItem = item?.allow_group_gifting === true || hasGroupGiftClaims;
  
  if (isGroupGiftItem && item?.price_max && item.price_max > 0) {
    // For group gifts: item is claimed when total contributions >= price_max
    const totalContributions = claimsList
      .filter(c => c.payment_status === 'completed' && c.contribution_amount)
      .reduce((sum, c) => sum + (c.contribution_amount || 0), 0);
    
    return totalContributions >= item.price_max;
  } else {
    // For single gifts: item is claimed if any claim is completed or not_required
    return claimsList.some(
      (claim) => 
        claim.payment_status === 'completed' || 
        claim.payment_status === 'not_required'
    );
  }
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

/**
 * Format price with thousand separators
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
