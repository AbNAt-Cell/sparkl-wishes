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
          console.log("Using manually selected currency:", manualCurrency);
          setCurrency(manualCurrency);
          setIsAutoDetected(false);
          setIsLoading(false);
          return;
        }

        // Check for cached auto-detected currency
        const cachedDetected = localStorage.getItem(DETECTED_KEY);
        if (cachedDetected) {
          console.log("Using cached detected currency:", cachedDetected);
          setCurrency(cachedDetected);
          setIsLoading(false);
          return;
        }

        // Try multiple IP detection services with fallback
        let detectedCurrency = fallbackCurrency;
        let detected = false;

        try {
          // Primary: ipapi.co
          console.log("Attempting IP detection via ipapi.co");
          const response = await fetch("https://ipapi.co/json/", { timeout: 5000 });
          if (response.ok) {
            const data: GeoData = await response.json();
            console.log("IP Detection result:", data);
            detectedCurrency = data.currency || countryCurrencyMap[data.country_code] || fallbackCurrency;
            detected = true;
          }
        } catch (e) {
          console.warn("ipapi.co failed, trying alternative service:", e);
          try {
            // Fallback: ip-api.com
            const response = await fetch("https://ip-api.com/json/?fields=countryCode,currency", { timeout: 5000 });
            if (response.ok) {
              const data: any = await response.json();
              console.log("IP Detection result (fallback):", data);
              detectedCurrency = data.currency || countryCurrencyMap[data.countryCode] || fallbackCurrency;
              detected = true;
            }
          } catch (e2) {
            console.warn("Fallback IP detection also failed:", e2);
          }
        }

        // Cache the detected result (whether successful or using fallback)
        if (detected) {
          console.log("Caching detected currency:", detectedCurrency);
          localStorage.setItem(DETECTED_KEY, detectedCurrency);
        } else {
          console.log("Using fallback currency:", detectedCurrency);
        }
        
        setCurrency(detectedCurrency);
      } catch (error) {
        console.warn("Unexpected error in currency detection:", error);
        setCurrency(fallbackCurrency);
      } finally {
        setIsLoading(false);
      }
    };

    detectCurrency();
  }, [fallbackCurrency]);

  const setCurrencyManually = useCallback((newCurrency: string) => {
    console.log("Setting currency manually to:", newCurrency);
    localStorage.setItem(STORAGE_KEY, newCurrency);
    setCurrency(newCurrency);
    setIsAutoDetected(false);
  }, []);

  const resetToAutoDetected = useCallback(() => {
    console.log("Resetting to auto-detected currency");
    localStorage.removeItem(STORAGE_KEY);
    const detected = localStorage.getItem(DETECTED_KEY);
    if (detected) {
      console.log("Resetting to cached:", detected);
      setCurrency(detected);
    } else {
      console.log("No cached currency, using fallback");
      setCurrency("USD");
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
