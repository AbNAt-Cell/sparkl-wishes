import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

type SetUserFlagsPayload = {
  userId: string;
  isBanned?: boolean;
  isAdmin?: boolean;
};

type UpdateClaimPayload = {
  claimId: string;
  paymentStatus?: string;
  status?: string;
};

type WithdrawalPayload = {
  requestId: string;
  status: string;
  adminNotes?: string;
};

type RequestBody =
  | { action: "set_user_flags"; payload: SetUserFlagsPayload }
  | { action: "export_users_csv" }
  | { action: "update_setting"; payload: { key: string; value: unknown } }
  | { action: "update_claim_status"; payload: UpdateClaimPayload }
  | { action: "delete_claim"; payload: { claimId: string } }
  | { action: "update_withdrawal_status"; payload: WithdrawalPayload };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  try {
    const authHeader = req.headers.get("Authorization");
    const authedClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader ?? "" } },
    });
    const { data: { user }, error: userErr } = await authedClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const role = user.app_metadata?.role;
    if (role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const body = (await req.json()) as RequestBody;
    const adminClient = createClient(supabaseUrl, serviceKey);

    if (body.action === "set_user_flags") {
      const { userId, isBanned, isAdmin } = body.payload;
      const updates: Record<string, unknown> = {};
      if (typeof isBanned === "boolean") updates.is_banned = isBanned;
      if (typeof isAdmin === "boolean") updates.is_admin = isAdmin;

      if (Object.keys(updates).length === 0) {
        return new Response(JSON.stringify({ error: "No updates provided" }), { status: 400, headers: corsHeaders });
      }

      const { error } = await adminClient
        .from("profiles")
        .update(updates)
        .eq("id", userId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "export_users_csv") {
      const { data, error } = await adminClient
        .from("profiles")
        .select("id, full_name, is_admin, is_banned")
        .order("full_name", { ascending: true });
      if (error) throw error;

      const rows = ["id,full_name,is_admin,is_banned", ...(data ?? []).map(r => `${r.id},"${(r.full_name ?? "").replaceAll('"', '""')}",${r.is_admin ?? false},${r.is_banned ?? false}`)];
      const csv = rows.join("\n");
      return new Response(csv, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=users.csv",
        },
      });
    }

    if (body.action === "update_setting") {
      const { key, value } = body.payload;
      const { error } = await adminClient
        .from("app_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "update_claim_status") {
      const { claimId, paymentStatus, status } = body.payload;
      const updates: Record<string, unknown> = {};
      if (paymentStatus) updates.payment_status = paymentStatus;
      if (status) updates.status = status;

      if (Object.keys(updates).length === 0) {
        return new Response(JSON.stringify({ error: "No updates provided" }), { status: 400, headers: corsHeaders });
      }

      const { error } = await adminClient
        .from("claims")
        .update(updates)
        .eq("id", claimId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "delete_claim") {
      const { claimId } = body.payload;
      const { error } = await adminClient
        .from("claims")
        .delete()
        .eq("id", claimId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "update_withdrawal_status") {
      const { requestId, status, adminNotes } = body.payload;
      const userId = user.id;

      // Get the withdrawal request details first
      const { data: withdrawal, error: withdrawalError } = await adminClient
        .from("withdrawal_requests")
        .select("*, user_wallets(balance, user_id)")
        .eq("id", requestId)
        .single();

      if (withdrawalError) {
        return new Response(JSON.stringify({ error: withdrawalError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update withdrawal status
      const updateData: Record<string, unknown> = {
        status,
        processed_by: userId,
        processed_at: new Date().toISOString(),
      };

      if (adminNotes) {
        updateData.admin_notes = adminNotes;
      }

      const { error: updateError } = await adminClient
        .from("withdrawal_requests")
        .update(updateData)
        .eq("id", requestId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If completing, deduct from wallet balance
      if (status === "completed" && withdrawal) {
        const { error: deductError } = await adminClient
          .from("user_wallets")
          .update({
            balance: withdrawal.user_wallets.balance - withdrawal.amount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", withdrawal.wallet_id);

        if (deductError) {
          console.error("Error deducting from wallet:", deductError);
        }

        // Create withdrawal transaction
        await adminClient.from("wallet_transactions").insert({
          wallet_id: withdrawal.wallet_id,
          amount: withdrawal.amount,
          type: "debit",
          status: "completed",
          description: "Withdrawal completed",
          reference: requestId,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});


