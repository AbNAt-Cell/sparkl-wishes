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
