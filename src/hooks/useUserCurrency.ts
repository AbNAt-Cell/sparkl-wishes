import { useState, useEffect, useCallback } from "react";

interface GeoData {
  country_code: string;
  currency: string;
}

// Map country codes to currencies
const countryCurrencyMap: Record<string, string> = {
  NG: "NGN",
  US: "USD",
  GB: "GBP",
  EU: "EUR",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  PT: "EUR",
  IE: "EUR",
  FI: "EUR",
  GR: "EUR",
  CA: "CAD",
  AU: "AUD",
  JP: "JPY",
  CN: "CNY",
  IN: "INR",
  ZA: "ZAR",
  KE: "KES",
  GH: "GHS",
  EG: "EGP",
  AE: "AED",
  SA: "SAR",
  BR: "BRL",
  MX: "MXN",
  SG: "SGD",
  HK: "HKD",
  NZ: "NZD",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  PL: "PLN",
  RU: "RUB",
  KR: "KRW",
  TH: "THB",
  MY: "MYR",
  ID: "IDR",
  PH: "PHP",
  VN: "VND",
  PK: "PKR",
  BD: "BDT",
};

// Popular currencies for the selector
export const availableCurrencies = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
];

const STORAGE_KEY = "user_currency";
const DETECTED_KEY = "detected_currency";

export const useUserCurrency = (fallbackCurrency: string = "USD") => {
  const [currency, setCurrency] = useState<string>(fallbackCurrency);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoDetected, setIsAutoDetected] = useState(true);

  useEffect(() => {
    const detectCurrency = async () => {
      try {
        // Check if user has manually selected a currency
        const manualCurrency = localStorage.getItem(STORAGE_KEY);
        if (manualCurrency) {
          setCurrency(manualCurrency);
          setIsAutoDetected(false);
          setIsLoading(false);
          return;
        }

        // Check for cached auto-detected currency
        const cachedDetected = localStorage.getItem(DETECTED_KEY);
        if (cachedDetected) {
          setCurrency(cachedDetected);
          setIsLoading(false);
          return;
        }

        // Use ipapi.co for free IP geolocation
        const response = await fetch("https://ipapi.co/json/");
        if (!response.ok) throw new Error("Failed to fetch location");
        
        const data: GeoData = await response.json();
        const detectedCurrency = data.currency || countryCurrencyMap[data.country_code] || fallbackCurrency;
        
        // Cache the detected result
        localStorage.setItem(DETECTED_KEY, detectedCurrency);
        setCurrency(detectedCurrency);
      } catch (error) {
        console.warn("Could not detect currency from IP:", error);
        setCurrency(fallbackCurrency);
      } finally {
        setIsLoading(false);
      }
    };

    detectCurrency();
  }, [fallbackCurrency]);

  const setCurrencyManually = useCallback((newCurrency: string) => {
    localStorage.setItem(STORAGE_KEY, newCurrency);
    setCurrency(newCurrency);
    setIsAutoDetected(false);
  }, []);

  const resetToAutoDetected = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    const detected = localStorage.getItem(DETECTED_KEY);
    if (detected) {
      setCurrency(detected);
    }
    setIsAutoDetected(true);
  }, []);

  return { 
    currency, 
    isLoading, 
    isAutoDetected,
    setCurrency: setCurrencyManually,
    resetToAutoDetected
  };
};
