import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PaymentsSettings = {
  paystackEnabled: boolean;
  allowedMethods: string[];
  platformFeePercent: number; // 0..1
  platformFeeMin: number;     // absolute currency unit
  platformFeeMax: number;     // absolute currency unit
};

export type PremiumSettings = {
  enabled: boolean;
  price: number;
  currency: string;
};

export type AppSettings = {
  payments: PaymentsSettings;
  premium: PremiumSettings;
};

const defaultSettings: AppSettings = {
  payments: {
    paystackEnabled: true,
    allowedMethods: ["card", "bank_transfer", "mobile_money"],
    platformFeePercent: 0.05,
    platformFeeMin: 0,
    platformFeeMax: 100,
  },
  premium: {
    enabled: true,
    price: 5000,
    currency: "NGN",
  },
};

// Helper to normalize database response
const normalizePaymentSettings = (dbValue: any): PaymentsSettings => {
  // Handle both 'enabled' (from DB) and 'paystackEnabled' (from code)
  const enabled = dbValue?.enabled ?? dbValue?.paystackEnabled ?? true;
  
  return {
    paystackEnabled: enabled,
    allowedMethods: dbValue?.allowedMethods ?? defaultSettings.payments.allowedMethods,
    platformFeePercent: dbValue?.platformFeePercent ?? defaultSettings.payments.platformFeePercent,
    platformFeeMin: dbValue?.platformFeeMin ?? defaultSettings.payments.platformFeeMin,
    platformFeeMax: dbValue?.platformFeeMax ?? defaultSettings.payments.platformFeeMax,
  };
};

const normalizePremiumSettings = (dbValue: any): PremiumSettings => {
  return {
    enabled: dbValue?.enabled ?? defaultSettings.premium.enabled,
    price: dbValue?.price ?? defaultSettings.premium.price,
    currency: dbValue?.currency ?? defaultSettings.premium.currency,
  };
};

export function useAppSettings() {
  return useQuery({
    queryKey: ["app-settings"],
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["payments", "premium"]);
      if (error) throw error;
      const map = new Map<string, any>((data ?? []).map((r: any) => [r.key, r.value]));
      const dbPayments = map.get("payments");
      const dbPremium = map.get("premium");
      
      return {
        payments: normalizePaymentSettings(dbPayments),
        premium: normalizePremiumSettings(dbPremium),
      };
    },
    staleTime: 60_000,
  });
}


