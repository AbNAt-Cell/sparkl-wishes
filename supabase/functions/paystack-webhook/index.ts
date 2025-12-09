import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // === 1. Verify Paystack Signature ===
    const signature = req.headers.get("x-paystack-signature");
    const bodyText = await req.text();

    if (!signature || !paystackSecretKey) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const hash = createHmac("sha512", paystackSecretKey).update(bodyText).digest("hex");
    if (hash !== signature) {
      console.error("Invalid Paystack signature");
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }

    const event = JSON.parse(bodyText);

    // === 2. Handle charge.success ===
    if (event.event === "charge.success") {
      const { reference, amount, customer } = event.data;

      const match = reference.match(/^claim_([a-f0-9-]+)_/);
      if (!match) {
        return new Response(JSON.stringify({ message: "Ignored: not a claim reference" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const claimId = match[1];

      // === 3. Fetch claim with current status ===
      const { data: claim, error: fetchError } = await supabase
        .from("claims")
        .select("id, status, payment_status, item_id, contribution_amount")
        .eq("id", claimId)
        .single();

      if (fetchError || !claim) {
        console.error("Claim not found:", claimId);
        return new Response("Claim not found", { status: 404, headers: corsHeaders });
      }

      // === 4. Prevent duplicate processing ===
      if (claim.payment_status === "completed" || claim.status === "completed") {
        console.log("Already processed claim:", claimId, "Status:", { payment_status: claim.payment_status, status: claim.status });
        return new Response(JSON.stringify({ message: "Already processed" }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      // === 5. Mark claim as FULLY COMPLETED ===
      // Use upsert-like logic: update only if not already fully completed
      // This handles race conditions where client callback might have already updated payment_status
      const updateData: any = {
        payment_method: "paystack",
        payment_reference: reference,
      };
      
      // Only set status fields if not already completed
      if (claim.status !== "completed") {
        updateData.status = "completed";
      }
      if (claim.payment_status !== "completed") {
        updateData.payment_status = "completed";
      }

      const { data: updatedClaim, error: updateError } = await supabase
        .from("claims")
        .update(updateData)
        .eq("id", claimId)
        .select()
        .single();

      if (updateError) {
        console.error("Failed to update claim:", updateError);
        throw updateError;
      }

      // Check if update actually happened (might have been updated by client callback)
      if (!updatedClaim) {
        console.log(`Claim ${claimId} was already updated (likely by client callback)`);
        return new Response(JSON.stringify({ message: "Claim already updated" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Claim ${claimId} fully completed via Paystack webhook`);

      // === 6. Get item name for notification ===
      const { data: item } = await supabase
        .from("wishlist_items")
        .select("name")
        .eq("id", claim.item_id)
        .single();

      const itemName = item?.name || "your wishlist item";

      // === 7. Send notification (optional) ===
      if (customer?.email) {
        supabase.functions.invoke("notifications", {
          body: {
            type: "claim.paid",
            to: [{ email: customer.email }],
            subject: `You paid for "${itemName}"`,
            text: `Your payment (₦${amount / 100}) was successful! Thank you for supporting this wish.`,
            html: `<p>Your payment of <strong>₦${(amount / 100).toLocaleString()}</strong> was successful!</p>
                   <p>Thank you for helping make <strong>"${itemName}"</strong> come true 🎉</p>`,
          },
        }).catch(err => console.warn("Notification failed:", err));
      }

      return new Response(JSON.stringify({ message: "Claim completed successfully" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other events
    return new Response(JSON.stringify({ message: "Event received" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
