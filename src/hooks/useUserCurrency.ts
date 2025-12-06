import { useState, useEffect } from "react";

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

export const useUserCurrency = (fallbackCurrency: string = "USD") => {
  const [currency, setCurrency] = useState<string>(fallbackCurrency);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detectCurrency = async () => {
      try {
        // Try to get cached currency first
        const cachedCurrency = localStorage.getItem("user_currency");
        if (cachedCurrency) {
          setCurrency(cachedCurrency);
          setIsLoading(false);
          return;
        }

        // Use ipapi.co for free IP geolocation
        const response = await fetch("https://ipapi.co/json/");
        if (!response.ok) throw new Error("Failed to fetch location");
        
        const data: GeoData = await response.json();
        const detectedCurrency = data.currency || countryCurrencyMap[data.country_code] || fallbackCurrency;
        
        // Cache the result
        localStorage.setItem("user_currency", detectedCurrency);
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

  return { currency, isLoading };
};
