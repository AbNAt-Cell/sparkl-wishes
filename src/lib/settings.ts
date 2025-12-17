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

export type WhatsAppSettings = {
  enabled: boolean;
  whatsappLink: string;
};

export type TokenFeeSettings = {
  personalDeliveryFeeNGN: number; // Fee in NGN
};

export type AppSettings = {
  payments: PaymentsSettings;
  premium: PremiumSettings;
  features?: {
    cashFundsEnabled?: boolean;
  };
  whatsapp?: WhatsAppSettings;
  tokenFees?: TokenFeeSettings;
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
  features: {
    cashFundsEnabled: true,
  },
  whatsapp: {
    enabled: false,
    whatsappLink: "",
  },
  tokenFees: {
    personalDeliveryFeeNGN: 2000,
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

const normalizeWhatsAppSettings = (dbValue: any): WhatsAppSettings => {
  return {
    enabled: dbValue?.enabled ?? defaultSettings.whatsapp?.enabled ?? false,
    whatsappLink: dbValue?.whatsappLink ?? defaultSettings.whatsapp?.whatsappLink ?? "",
  };
};

const normalizeTokenFeeSettings = (dbValue: any): TokenFeeSettings => {
  return {
    personalDeliveryFeeNGN: dbValue?.personalDeliveryFeeNGN ?? defaultSettings.tokenFees?.personalDeliveryFeeNGN ?? 2000,
  };
};

export function useAppSettings() {
  return useQuery({
    queryKey: ["app-settings"],
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["payments", "premium", "features", "whatsapp", "tokenFees"]);
      if (error) throw error;
      const map = new Map<string, any>((data ?? []).map((r: any) => [r.key, r.value]));
      const dbPayments = map.get("payments");
      const dbPremium = map.get("premium");
      const dbFeatures = map.get("features");
      const dbWhatsApp = map.get("whatsapp");
      const dbTokenFees = map.get("tokenFees");
      
      return {
        payments: normalizePaymentSettings(dbPayments),
        premium: normalizePremiumSettings(dbPremium),
        features: {
          cashFundsEnabled: dbFeatures?.cashFundsEnabled ?? defaultSettings.features.cashFundsEnabled,
        },
        whatsapp: normalizeWhatsAppSettings(dbWhatsApp),
        tokenFees: normalizeTokenFeeSettings(dbTokenFees),
      };
    },
    staleTime: 60_000,
  });
}


