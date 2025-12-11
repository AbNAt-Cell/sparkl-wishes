import { useState, useEffect } from "react";

// Exchange rates relative to USD (updated periodically)
// These are approximate and should be refreshed periodically
const exchangeRates: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  NGN: 1550,
  ZAR: 18.5,
  KES: 129,
  GHS: 15.2,
  CAD: 1.32,
  AUD: 1.52,
  INR: 83,
  CNY: 7.1,
  BRL: 5.0,
  CHF: 0.88,
  SEK: 10.8,
  NOK: 10.5,
  DKK: 6.85,
  PLN: 4.0,
  RUB: 98,
  KRW: 1320,
  THB: 35,
  MYR: 4.7,
  IDR: 15800,
  PHP: 56,
  VND: 24500,
  PKR: 278,
  BDT: 118,
  AED: 3.67,
  SAR: 3.75,
  EGP: 49,
};

interface ConversionRate {
  from: string;
  to: string;
  rate: number;
}

export const useCurrencyConversion = () => {
  const [rates, setRates] = useState<Record<string, number>>(exchangeRates);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch fresh exchange rates from an API (only once per session)
  useEffect(() => {
    const fetchRates = async () => {
      try {
        setIsLoading(true);

        // Try to fetch from exchangerate-api.com (free tier available)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 5000);

        const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.rates) {
            setRates(data.rates);
            setLastUpdated(new Date());
          }
        }
      } catch (error) {
        // Silently use fallback rates
        setRates(exchangeRates);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRates();
  }, []);

  /**
   * Convert an amount from one currency to another
   */
  const convert = (amount: number, fromCurrency: string, toCurrency: string): number => {
    try {
      if (fromCurrency === toCurrency) {
        return amount;
      }

      const fromRate = rates[fromCurrency];
      const toRate = rates[toCurrency];

      if (!fromRate || !toRate) {
        return amount;
      }

      // Convert to USD first, then to target currency
      const amountInUSD = amount / fromRate;
      const convertedAmount = amountInUSD * toRate;

      return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
    } catch (err) {
      return amount;
    }
  };

  /**
   * Get the conversion rate between two currencies
   */
  const getRate = (fromCurrency: string, toCurrency: string): number | null => {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];

    if (!fromRate || !toRate) {
      return null;
    }

    return (toRate / fromRate) * 1000 / 1000; // Maintain precision
  };

  return {
    convert,
    getRate,
    rates,
    isLoading,
    lastUpdated,
  };
};
