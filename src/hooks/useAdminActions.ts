// src/hooks/useAdminActions.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useAdminActions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, payload }: { action: string; payload?: any }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(
        "https://ruzknsqkkbzyleqmmboc.supabase.co/functions/v1/admin-actions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action, payload }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Admin action failed (${res.status})`);
      }

      // Special handling for CSV export
      if (action === "export_users_csv") {
        const csv = await res.text();
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "users.csv";
        a.click();
        URL.revokeObjectURL(url);
        return { success: true };
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success("Action completed successfully");
      queryClient.invalidateQueries(); // refresh everything
    },
    onError: (error: any) => {
      toast.error(error.message || "Admin action failed");
    },
  });
};
