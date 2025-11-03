import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PaymentsSettings = {
  paystackEnabled: boolean;
  allowedMethods: string[];
  platformFeePercent: number; // 0..1
  platformFeeMin: number;     // absolute currency unit
  platformFeeMax: number;     // absolute currency unit
};

export type AppSettings = {
  payments: PaymentsSettings;
};

const defaultSettings: AppSettings = {
  payments: {
    paystackEnabled: true,
    allowedMethods: ["card", "bank_transfer", "mobile_money"],
    platformFeePercent: 0.05,
    platformFeeMin: 0,
    platformFeeMax: 100,
  },
};

export function useAppSettings() {
  return useQuery({
    queryKey: ["app-settings"],
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["payments"]); // extendable later
      if (error) throw error;
      const map = new Map<string, any>((data ?? []).map((r: any) => [r.key, r.value]));
      return {
        payments: { ...defaultSettings.payments, ...(map.get("payments") ?? {}) },
      };
    },
    staleTime: 60_000,
  });
}


