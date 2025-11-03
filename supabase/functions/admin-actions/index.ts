import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

type SetUserFlagsPayload = {
  userId: string;
  isBanned?: boolean;
  isAdmin?: boolean;
};

type RequestBody =
  | { action: "set_user_flags"; payload: SetUserFlagsPayload }
  | { action: "export_users_csv" };

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

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});


